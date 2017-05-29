import * as _ from "lodash"
import * as React from "react"
import { Props, State } from "./helper.type"

// 根据类型生成处理函数
const parser = (type: string): (value?: string) => number | string | boolean => {
  switch (type) {
    case "number":
      return Number
    case "string":
      return (value: string) => {
        return value && value.toString()
      }
    case "boolean":
      return Boolean
  }
}

export default class RenderHelper extends React.Component<Props, State> {
  public static defaultProps = new Props()
  public state = new State()

  // 内部组件实例
  public wrappedInstance: React.ReactInstance

  private instanceInfo: any
  private componentClass: React.ComponentClass<any>

  // 事件数据
  private eventData: any

  public componentWillMount() {
    // 从 store 找到自己信息
    this.instanceInfo = this.props.viewport.instances.get(this.props.instanceKey)

    // 获取当前要渲染的组件 class
    this.componentClass = this.props.viewport.componentClasses.get(this.instanceInfo.gaeaKey)

    // 执行 trigger -> init 事件
    if (this.instanceInfo.data.events) {
      this.instanceInfo.data.events.forEach((event: any) => {
        switch (event.trigger) {
          case "init":
            this.runEvent(event)
            break
          case "subscribe":
            this.props.viewport.event.on(event.triggerData.name, this.handleSubscribe)
            break
        }
      })
    }
  }

  public componentWillUnmount() {
    if (this.instanceInfo.data.events) {
      this.instanceInfo.data.events.forEach((event: any) => {
        if (event.trigger === "subscribe") {
          this.props.viewport.event.off(event.triggerData.name, this.handleSubscribe)
        }
      })
    }
  }

  /**
   * 监听事件执行了
   */
  public handleSubscribe = (context: any) => {
    this.runEvent(context)
  }

  /**
   * 执行事件
   */
  public runEvent = (event: any, ...values: any[]) => {
    switch (event.action) {
      case "none":
        // 啥都不做  
        break

      default:
    }
  }

  /**
   * 返回调用自己的方法的 key -> Array<value>
   */
  public getSelfFunctionMap = () => {
    const functionMap = new Map()

    if (this.instanceInfo.data.events) {
      this.instanceInfo.data.events.forEach((event: any) => {
        if (event.trigger === "callback") {
          if (functionMap.has(event.triggerData.trigger)) {
            const functionList = functionMap.get(event.triggerData.trigger)
            functionList.push(event)
            functionMap.set(event.triggerData.trigger, functionList)
          } else {
            functionMap.set(event.triggerData.trigger, [event])
          }
        }
      })
    }
    return functionMap
  }

  public render() {
    // 子元素
    let childs: Array<React.ReactElement<any>> = null

    // 是否可以有子元素
    if (this.componentClass.defaultProps.gaeaSetting.isContainer && this.instanceInfo.childs) {
      childs = this.instanceInfo.childs.map((childKey: any) => {
        return (
          <RenderHelper key={childKey}
            viewport={this.props.viewport}
            instanceKey={childKey} />
        )
      })
    }

    const props: any = {}

    // 将回调事件添加到 props 中
    const functionMap = this.getSelfFunctionMap()
    functionMap.forEach((value: any, key: string) => {
      props[key] = (...args: any[]) => {
        value.forEach((eachValue: any) => {
          this.runEvent.apply(this, [eachValue, ...args])
        })
      }
    })

    props.isPreview = true

    // 将变量字段替换成变量
    // props.gaeaVariables && Object.keys(props.gaeaVariables).forEach(variableField => {
    //   const variable = props.gaeaVariables[variableField]
    //   if (!variable) {
    //     // 可能还没赋值，是 null
    //     return
    //   }
    //   const myParser = parser(variable.valueType)
    //   switch (variable.variableType) {
    //     case "externalParameter":
    //       props[variableField] = this.props.preview.params[variable.variableField] ? myParser(this.props.preview.params[variable.variableField]) : null
    //       break
    //   }
    // })

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

    props.ref = (ref: React.ReactInstance) => {
      this.wrappedInstance = ref
    }

    // gaeaData 注入
    props.gaeaData = this.props.gaeaData

    // 注入 props
    _.merge(props, _.get(this.instanceInfo, "data.props") || {})

    return React.createElement(this.componentClass, props, childs)
  }
}
