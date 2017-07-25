declare module hyperapp {

/** @namespace [Virtual DOM] */

/** The Virtual DOM representation of an Element
 *
 * @memberOf [Virtual DOM]
*/
export interface VirtualNode<Data> {
  tag: string
  data: Data
  children: VirtualNodeChild<{} | null>[]
}

/** In the Virtual DOM a Child could be either a Virtual Node or a string
 *
 * @memberOf [Virtual DOM]
*/
export type VirtualNodeChild<Data> = VirtualNode<Data> | string

/** A Component is a function that return a custom Virtual Node
 *
 * @memberOf [Virtual DOM]
*/
export interface Component<Data> {
  (data?: Data, ...children: VirtualNodeChild<{} | null>[]): VirtualNode<Data>
}

/** The soft way to create a Virtual Node
 * @param tag       Either a tag name e.g. 'div', 'svg', etc. Or a Component function
 * @param data      Any valid HTML atributes, events, styles, lifecycle events, and meta data
 * @param children  The children of the VirtualNode
 *
 * @memberOf [Virtual DOM]
*/
export function h<Data>(
  tag: Component<Data> | string,
  data?: Data,
  children?:
    | VirtualNodeChild<{} | null>[]
    | VirtualNodeChild<{} | null>
    | number
): VirtualNode<Data>

/** @namespace [Application] */

export interface Emit<Data, Events> {
  /** Call succesively each event handler of the specified event
   * @param name  The name of the event to call
   * @param data  Will be reduced by each event handler
   *
   * @memberOF [Application]
  */
  (name: keyof Events, data?: Data): Data
}

export function app<State, Actions, Events>(app: {}): Emit<{} | null, Events>

/** @namespace [JSX] */

}