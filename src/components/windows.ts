//import { as, getCurrent, current } from '../core/neovim'
//import { debounce, merge } from '../support/utils'
//import * as dispatch from '../messaging/dispatch'
//import { px } from '../core/canvasgrid'

//// TODO: this whole thing is kind of a dirty hack until we get floating/external windows in the neovim api
//export interface VeonimWindow {
  //x: number,
  //y: number,
  //height: number,
  //width: number,
  //name: string,
  //modified: boolean,
  //active: boolean,
//}

//export interface Window {
  //x: string,
  //y: string,
  //width: string,
  //height: string,
  //name: string,
  //nearEdge: boolean,
  //nearTop: boolean,
  //rawHeight: number,
//}

//export interface Nameplate {
  //name: string,
  //modified: boolean,
  //active: boolean,
  //x: string,
  //y: string,
  //width: string,
//}

//const generateElements = (count = 20) => [...Array(count)]
  //.map(() => document.createElement('div'))
  //.map(e => (merge(e.style, {
    //position: 'absolute',
    //display: 'none',
    //background: 'none',
  //}), e))

//const canvasContainer = document.getElementById('canvas-container') as HTMLElement
//const container = document.getElementById('windows') as HTMLElement
//const elements = generateElements(20)
//const nameplates = generateElements(20).map(np => (merge(np.style, {
  //border: 'none',
  //height: px.row.height(1) + 'px',
//}), np))

//elements.forEach(e => container.appendChild(e))
////nameplates.forEach(n => container.appendChild(n))

//const getWindows = async (): Promise<VeonimWindow[]> => {
  //const currentBuffer = (await getCurrent.buffer).id
  //const wins = await (await getCurrent.tab).windows

  //return await Promise.all(wins.map(async w => {
    //const [ [ y, x ], buffer ] = await Promise.all([
      //w.position,
      //as.buf(w.buffer)
    //])

    //return {
      //x,
      //y,
      //height: await w.height,
      //width: await w.width,
      //name: (await buffer.name),
      //active: (await buffer.id) === currentBuffer,
      //modified: (await buffer.getOption('modified')),
    //}
  //}))
//}

//const nearEdge = (x: number): boolean => canvasContainer.getBoundingClientRect().width - x < 10
//const nearTop = (y: number): boolean => canvasContainer.getBoundingClientRect().top - y < 6

//const asWindow = (w: VeonimWindow): Window => ({
  //name: w.name.replace(current.cwd + '/', ''),
  //x: (px.col.x(w.x) + 4) + 'px',
  //y: px.row.y(w.y) + 'px',
  //width: px.col.width(w.width) + 'px',
  //height: px.row.height(w.height) + 'px',
  //nearEdge: nearEdge(px.col.width(w.width) + px.col.x(w.x)),
  //nearTop: nearTop(px.row.y(w.y)),
  //rawHeight: px.row.height(w.height),
//})

////const asNameplate = (w: VeonimWindow): Nameplate => ({
  ////active: w.active,
  ////modified: w.modified,
  ////name: w.name.replace(current.cwd + '/', ''),
  ////x: px.col.x(w.x) + 'px',
  ////y: (px.row.y(w.y) + px.row.height(w.height)) + 'px',
  ////width: px.col.width(w.width) + 'px',
////})


//const applyWindow = (w: Window, el: HTMLElement): HTMLElement => (merge(el.style, {
  //width: w.width,
  //height: w.nearTop ? (w.rawHeight + 6) + 'px' : w.height,
  //top: w.y,
  //left: w.x,
  //display: '',
  //borderRight: w.nearEdge ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
  //marginTop: w.nearTop ? '-6px' : '0',
//}), el)

////const applyNameplate = (n: Nameplate, el: HTMLElement): HTMLElement => {
  ////merge(el.style, {
    ////background: n.active ? '#2a2a2a' : '#222',
    ////color: n.active ? '#eee' : '#aaa',
    ////width: n.width,
    ////top: n.y,
    ////left: n.x,
    ////display: '',
  ////})

  ////el.innerText = n.name
  ////if (n.modified) el.innerText += ' *'
  ////return el
////}

//export const render = async () => {
  //const vimWindows = await getWindows()

  //vimWindows.forEach(w => console.log(w))

  //const windows = vimWindows.map(asWindow)
  ////const plates = vimWindows.map(asNameplate)

  //// TODO: cache the thing and skip render if wins not changed
  //// or actually just need to vdom diff lol
  //// if props not changed, skip render
  //const windowCount = windows.length
  //const elCount = elements.length

  //if (windowCount > elCount) {
    //const newWinCount = windowCount - elCount
    //const newElements = generateElements(newWinCount)
    //newElements.forEach(e => container.appendChild(e))
    //elements.concat(newElements)
  //}

  //for (let ix = 0; ix < elCount; ix++) {
    //const el = elements[ix]
    //const np = nameplates[ix]

    //if (ix < windowCount) {
      //applyWindow(windows[ix], el)
      ////applyNameplate(plates[ix], np)
    //}

    //else {
      //if (el.style.display !== 'none') merge(el.style, { display: 'none' })
      //if (np.style.display !== 'none') merge(el.style, { display: 'none' })
    //}
  //}
//}

//// TODO: yeah maybe not
////dispatch.sub('redraw', debounce(() => render(), 32))
