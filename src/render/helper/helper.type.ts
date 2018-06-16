import Viewport from "../../store/viewport"

export class Props {
    public viewport?: Viewport

    /**
     * 当前元素的查找的 id
     */
    public instanceKey?: string

    /**
     * 通过编辑器配置，透传的变量
     */
    public data?: {
        [name: string]: any
    } = {}

    /**
     * 子组件的回调
     */
    public onCallback?: (data?: any) => void
}

export class State {
    /**
     * 当前组件给子元素提供的同级变量
     */
    public data?: {
        [name: string]: any
    } = {}
}
