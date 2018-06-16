import * as React from 'react';
import Component from '../../src/index';

class Props {}

class State {}

const obj: any = {
  gaea_instance_1: {
    gaeaKey: 'gaea-container',
    data: { props: { style: { display: 'block', flexGrow: 1 } } },
    childs: ['gaea_instance_3'],
    parentInstanceKey: null
  },
  gaea_instance_3: { gaeaKey: 'gaea-button', data: { props: {} }, childs: [], parentInstanceKey: 'gaea_instance_1' }
};

export default class Page extends React.PureComponent<Props, State> {
  public static defaultProps = new Props();
  public state = new State();

  public render() {
    return <Component value={obj} />;
  }
}
