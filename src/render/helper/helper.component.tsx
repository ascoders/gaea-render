import * as _ from 'lodash';
import * as React from 'react';
import shallowEq from 'shallow-eq';
import { Props, State } from './helper.type';

// 根据类型生成处理函数
const parser = (type: string): ((value?: string) => number | string | boolean) => {
  switch (type) {
    case 'number':
      return Number;
    case 'string':
      return (value: string) => {
        return value && value.toString();
      };
    case 'boolean':
      return Boolean;
  }
};

export default class RenderHelper extends React.Component<Props, State> {
  public static defaultProps = new Props();
  public state = new State();

  // 内部组件实例
  public wrappedInstance: React.ReactInstance;

  private instanceInfo: any;
  private componentClass: React.ComponentClass<any>;

  // 事件数据
  private eventData: any;

  public shouldComponentUpdate(nextProps: Props, nextState: State) {
    // state 浅相等，排除 data。并且 data 深相等，认为数据没变
    if (!shallowEq(this.state, nextState, ['data']) || !_.isEqual(this.state.data, nextState.data)) {
      return true;
    }

    // props 浅相等，排除 data。并且 data 深相等，认为数据没变
    if (!shallowEq(this.props, nextProps, ['data']) || !_.isEqual(this.props.data, nextProps.data)) {
      return true;
    }

    return false;
  }

  public componentWillMount() {
    // 从 store 找到自己信息
    this.instanceInfo = this.props.viewport.instances.get(this.props.instanceKey);

    // 获取当前要渲染的组件 class
    this.componentClass = this.props.viewport.componentClasses.get(this.instanceInfo.gaeaKey);

    // 执行 trigger -> init 事件
    if (this.instanceInfo.data.events) {
      this.instanceInfo.data.events.forEach((event: any) => {
        switch (event.trigger.type) {
          case 'init':
            this.runEvent(event);
            break;
          case 'subscribe':
            this.props.viewport.event.on(event.trigger.name, this.handleSubscribe);
            break;
        }
      });
    }
  }

  public componentWillUnmount() {
    if (this.instanceInfo.data.events) {
      this.instanceInfo.data.events.forEach((event: any) => {
        if (event.trigger.type === 'subscribe') {
          this.props.viewport.event.off(event.trigger.name, this.handleSubscribe);
        }
      });
    }
  }

  public render() {
    // 子元素
    let childs: Array<React.ReactElement<any>> = null;

    // 是否可以有子元素
    if (this.componentClass.defaultProps.editSetting.isContainer && this.instanceInfo.childs) {
      childs = this.instanceInfo.childs.map((childKey: any, index: number) => {
        const childProps: any = {
          key: childKey,
          viewport: this.props.viewport,
          instanceKey: childKey,
          onCallback: this.handleCallback
        };

        const childInstance = this.props.viewport.instances.get(childKey);
        if (childInstance.variables) {
          childProps.data = {};
          Object.keys(childInstance.variables).forEach((realField: string) => {
            const variable = childInstance.variables[realField];
            childProps.data[variable.key] = this.state.data[variable.key];
          });
        }

        return React.createElement(RenderHelper, childProps);
      });
    }

    const props: any = {};

    // 将回调事件添加到 props 中
    const functionMap = this.getSelfFunctionMap();
    functionMap.forEach((value: any, key: string) => {
      props[key] = (...args: any[]) => {
        value.forEach((eachValue: any) => {
          this.runEvent.apply(this, [eachValue, ...args]);
        });
      };
    });

    // render 模式就是 preview 模式
    props.isPreview = true;

    props.ref = (ref: React.ReactInstance) => {
      this.wrappedInstance = ref;
    };

    // 注入 props
    _.merge(props, _.get(this.instanceInfo, 'data.props') || {});

    // 实装变量设置
    if (this.instanceInfo.variables) {
      Object.keys(this.instanceInfo.variables).forEach((realField: string) => {
        const variable = this.instanceInfo.variables[realField];
        switch (variable.type) {
          case 'sibling':
            // 同级传参，从 props 获取
            _.set(props, realField, this.props.data[variable.key]);
            break;
        }
      });
    }

    // 遍历所有字符串常量的值，如果是 ${xxx.xxx} 类型，表示使用传递变量
    // Object.keys(props).forEach(propsField => {
    //   if (propsField.startsWith("gaea")) {
    //     return
    //   }

    //   try {
    //     props[propsField] = props[propsField].replace(/\$\{(.*)\}/g, (str: string, match: string) => {
    //       return _.get(this.props.gaeaData, match)
    //     })
    //   } catch (err) {
    //     //
    //   }
    // })

    //

    return React.createElement(this.componentClass, _.merge({}, this.componentClass.defaultProps, props), childs);
  }

  /**
   * 子元素触发的回调，用来触发同层级传值的事件
   */
  private handleCallback = (data: any) => {
    this.setState(state => {
      return {
        ...state,
        data: {
          ...state.data,
          [data.name]: data.value
        }
      };
    });
  };

  /**
   * 监听事件执行了
   */
  private handleSubscribe = (context: any) => {
    this.runEvent(context);
  };

  /**
   * 执行事件
   */
  private runEvent = (event: any, ...values: any[]) => {
    switch (event.action.type) {
      case 'none':
        break;
      case 'passingSiblingNodes':
        if (!event.actionData || !event.actionData.data) {
          return;
        }
        event.actionData.data.forEach((data: any, index: number) => {
          if (typeof this.props.onCallback === 'function') {
            // 通知父级，让父级刷新
            this.props.onCallback({
              name: data.name,
              value: values[index]
            });
          }
        });
        break;
      case 'jump':
        window.open(event.action.url);
      default:
    }
  };

  /**
   * 返回调用自己的方法的 key -> Array<value>
   */
  private getSelfFunctionMap = () => {
    const functionMap = new Map();

    if (this.instanceInfo.data.events) {
      this.instanceInfo.data.events.forEach((event: any) => {
        if (event.trigger.type === 'callback') {
          if (functionMap.has(event.trigger.field)) {
            const functionList = functionMap.get(event.trigger.field);
            functionList.push(event);
            functionMap.set(event.trigger.field, functionList);
          } else {
            functionMap.set(event.trigger.field, [event]);
          }
        }
      });
    }
    return functionMap;
  };
}
