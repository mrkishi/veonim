import { CompletionOption, getCompletionDetail } from '../ai/completions'
import { RowNormal, RowComplete } from '../components/row-container'
import { CompletionItemKind } from 'vscode-languageserver-types'
import * as canvasContainer from '../core/canvas-container'
import { activeWindow } from '../core/windows'
import Overlay from '../components/overlay'
import { paddingVH, cvar } from '../ui/css'
import * as Icon from 'hyperapp-feather'
import { cursor } from '../core/cursor'
import { h, app } from '../ui/uikit'

interface ShowParams {
  row: number,
  col: number,
  options: CompletionOption[],
}

const MAX_VISIBLE_OPTIONS = 12

const state = {
  x: 0,
  y: 0,
  ix: 0,
  anchorAbove: false,
  options: [] as CompletionOption[],
  visible: false,
  documentation: {} as any,
  visibleOptions: MAX_VISIBLE_OPTIONS,
}

type S = typeof state

// const pos: { container: ClientRect } = {
//   container: { left: 0, right: 0, bottom: 0, top: 0, height: 0, width: 0 }
// }

const icons = new Map([
  [ CompletionItemKind.Text, h(Icon.ChevronsRight) ],
  [ CompletionItemKind.Method, h(Icon.Box, { color: '#bb5ef1' }) ],
  [ CompletionItemKind.Property, h(Icon.Disc, { color: '#54c8ff' }) ],
  [ CompletionItemKind.Function, h(Icon.Share2, { color: '#6da7ff' }) ],
  [ CompletionItemKind.Constructor, h(Icon.Aperture, { color: '#c9ff56' }) ],
  [ CompletionItemKind.Field, h(Icon.Feather, { color: '#9866ff' }) ],
  [ CompletionItemKind.Variable, h(Icon.Database, { color: '#ff70e4' }) ],
  [ CompletionItemKind.Class, h(Icon.Compass, { color: '#ffeb5b' }) ],
  [ CompletionItemKind.Interface, h(Icon.Map, { color: '#ffa354' }) ],
  [ CompletionItemKind.Module, h(Icon.Grid, { color: '#ff5f54' }) ],
  [ CompletionItemKind.Unit, h(Icon.Cpu, { color: '#ffadc5' }) ],
  [ CompletionItemKind.Value, h(Icon.Bell, { color: '#ffa4d0' }) ],
  [ CompletionItemKind.Enum, h(Icon.Award, { color: '#84ff54' }) ],
  [ CompletionItemKind.Keyword, h(Icon.Navigation, { color: '#ff0c53' }) ],
  [ CompletionItemKind.Snippet, h(Icon.Paperclip, { color: '#0c2dff' }) ],
  [ CompletionItemKind.Color, h(Icon.Eye, { color: '#54ffe5' }) ],
  [ CompletionItemKind.File, h(Icon.File, { color: '#a5c3ff' }) ],
  [ CompletionItemKind.Reference, h(Icon.Link, { color: '#ffdca3' }) ],
  // TODO: enable when protocol upgrade to 3.6.0 in npm
  //[ CompletionItemKind.Folder, h('folder', { color: '#' }) ],
  //[ CompletionItemKind.EnumMember, h('menu', { color: '#' }) ],
  //[ CompletionItemKind.Constant, h('save', { color: '#' }) ],
  //[ CompletionItemKind.Struct, h('layers', { color: '#' }) ],
  //[ CompletionItemKind.Event, h('video', { color: '#' }) ],
  //[ CompletionItemKind.Operator, h('anchor', { color: '#' }) ],
  //[ CompletionItemKind.TypeParameter, h('type', { color: '#' }) ],
])

const getCompletionIcon = (kind: CompletionItemKind) => icons.get(kind) || h(Icon.Code)

const docs = (data: string) => h(RowNormal, {
  style: {
    ...paddingVH(6, 4),
    paddingTop: '6px',
    overflow: 'visible',
    whiteSpace: 'normal',
    color: cvar('foreground-20'),
    background: cvar('background-45'),
    fontSize: `${canvasContainer.font.size - 2}px`,
  }
}, [
  ,h('span', data)
])

const actions = {
  hide: () => ({ visible: false, ix: 0 }),
  showDocs: (documentation: any) => ({ documentation }),

  show: ({ anchorAbove, visibleOptions, options, x, y, ix = -1 }: any) => ({
    visibleOptions,
    anchorAbove,
    options,
    ix,
    x,
    y,
    visible: true,
    documentation: undefined
  }),

  select: (ix: number) => (s: S, a: typeof actions) => {
    const completionItem = (s.options[ix] || {}).raw

    if (completionItem) getCompletionDetail(completionItem)
      .then(m => m.documentation && a.showDocs(m.documentation))

    return { ix, documentation: undefined }
  },
}

const view = ($: S) => Overlay({
  x: $.x,
  y: $.y,
  zIndex: 200,
  maxWidth: 400,
  visible: $.visible,
  anchorAbove: $.anchorAbove,
}, [

  ,$.documentation && $.anchorAbove && docs($.documentation)

  ,h('div', {
    // onupdate: (e: HTMLElement) => pos.container = e.getBoundingClientRect(),
    style: {
      overflowY: 'hidden',
      background: cvar('background-30'),
      maxHeight: `${canvasContainer.cell.height * $.visibleOptions}px`,
    }
  }, $.options.map(({ text, kind }, id) => h(RowComplete, {
    key: `${text}-${kind}`,
    active: id === $.ix,
    // TODO: no scrolling because slow
    // onupdate: (e: HTMLElement) => {
    //   if (id !== $.ix) return
    //   const { top, bottom } = e.getBoundingClientRect()
    //   if (top < pos.container.top) return e.scrollIntoView(true)
    //   if (bottom > pos.container.bottom) return e.scrollIntoView(false)
    // },
  }, [
    ,h('div', {
      style: {
        display: 'flex',
        // TODO: this doesn't scale with font size?
        width: '24px',
        marginRight: '2px',
        alignItems: 'center',
        justifyContent: 'center',
      }
    }, [
      getCompletionIcon(kind),
    ])

    ,h('div', text)
  ])))

  ,$.documentation && !$.anchorAbove && docs($.documentation)

])

const ui = app<S, typeof actions>({ name: 'autocomplete', state, actions, view })

export const hide = () => ui.hide()
export const select = (index: number) => ui.select(index)
export const showDocs = (documentation: string) => ui.showDocs(documentation)
export const show = ({ row, col, options }: ShowParams) => {
  const visibleOptions = Math.min(MAX_VISIBLE_OPTIONS, options.length)
  const anchorAbove = cursor.row + visibleOptions > canvasContainer.size.rows 

  ui.show({
    anchorAbove,
    visibleOptions,
    options: options.slice(0, visibleOptions),
    x: activeWindow() ? activeWindow()!.colToX(col) : 0,
    y: activeWindow() ? activeWindow()!.rowToTransformY(anchorAbove ? row : row + 1) : 0,
  })
}
