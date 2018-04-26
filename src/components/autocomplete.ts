import { CompletionOption, getCompletionDetail } from '../ai/completions'
import { RowNormal, RowComplete } from '../components/row-container'
import { CompletionItemKind } from 'vscode-languageserver-types'
import * as canvasContainer from '../core/canvas-container'
import { activeWindow } from '../core/windows'
import Overlay from '../components/overlay'
import { cursor } from '../core/cursor'
import Icon from '../components/icon'
import { paddingVH } from '../ui/css'
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
  [ CompletionItemKind.Text, Icon('ChevronsRight') ],
  [ CompletionItemKind.Method, Icon('box', { color: '#bb5ef1' }) ],
  [ CompletionItemKind.Property, Icon('disc', { color: '#54c8ff' }) ],
  [ CompletionItemKind.Function, Icon('Share2', { color: '#6da7ff' }) ],
  [ CompletionItemKind.Constructor, Icon('aperture', { color: '#c9ff56' }) ],
  [ CompletionItemKind.Field, Icon('feather', { color: '#9866ff' }) ],
  [ CompletionItemKind.Variable, Icon('database', { color: '#ff70e4' }) ],
  [ CompletionItemKind.Class, Icon('compass', { color: '#ffeb5b' }) ],
  [ CompletionItemKind.Interface, Icon('map', { color: '#ffa354' }) ],
  [ CompletionItemKind.Module, Icon('grid', { color: '#ff5f54' }) ],
  [ CompletionItemKind.Unit, Icon('cpu', { color: '#ffadc5' }) ],
  [ CompletionItemKind.Value, Icon('bell', { color: '#ffa4d0' }) ],
  [ CompletionItemKind.Enum, Icon('award', { color: '#84ff54' }) ],
  [ CompletionItemKind.Keyword, Icon('navigation', { color: '#ff0c53' }) ],
  [ CompletionItemKind.Snippet, Icon('paperclip', { color: '#0c2dff' }) ],
  [ CompletionItemKind.Color, Icon('eye', { color: '#54ffe5' }) ],
  [ CompletionItemKind.File, Icon('file', { color: '#a5c3ff' }) ],
  [ CompletionItemKind.Reference, Icon('link', { color: '#ffdca3' }) ],
  // TODO: enable when protocol upgrade to 3.6.0 in npm
  //[ CompletionItemKind.Folder, Icon('folder', { color: '#' }) ],
  //[ CompletionItemKind.EnumMember, Icon('menu', { color: '#' }) ],
  //[ CompletionItemKind.Constant, Icon('save', { color: '#' }) ],
  //[ CompletionItemKind.Struct, Icon('layers', { color: '#' }) ],
  //[ CompletionItemKind.Event, Icon('video', { color: '#' }) ],
  //[ CompletionItemKind.Operator, Icon('anchor', { color: '#' }) ],
  //[ CompletionItemKind.TypeParameter, Icon('type', { color: '#' }) ],
])

const getCompletionIcon = (kind: CompletionItemKind) => icons.get(kind) || Icon('code')

const docs = (data: string) => h(RowNormal, {
  style: {
    ...paddingVH(6, 4),
    paddingTop: '6px',
    overflow: 'visible',
    whiteSpace: 'normal',
    color: 'var(--foreground-20)',
    background: 'var(--background-45)',
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
      background: 'var(--background-30)',
      overflowY: 'hidden',
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
