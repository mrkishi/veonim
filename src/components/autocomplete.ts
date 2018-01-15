import { CompletionOption, getCompletionDetail } from '../ai/completions'
import { CompletionItemKind } from 'vscode-languageserver-types'
import * as canvasContainer from '../core/canvas-container'
import { Row, panelColors } from '../styles/common'
import { activeWindow } from '../core/windows'
import { h, app, Actions } from '../ui/uikit'
import { cursor } from '../core/cursor'
import Icon from '../components/icon'
import { translate } from '../ui/css'

interface State {
  options: CompletionOption[],
  vis: boolean,
  ix: number,
  x: number,
  y: number,
  documentation?: string,
  anchorAbove: boolean,
}

interface ShowParams {
  row: number,
  col: number,
  options: CompletionOption[],
}

const MAX_VISIBLE_OPTIONS = 12

const state: State = {
  anchorAbove: false,
  options: [],
  vis: false,
  ix: 0,
  x: 0,
  y: 0,
}

const pos: { container: ClientRect } = {
  container: { left: 0, right: 0, bottom: 0, top: 0, height: 0, width: 0 }
}

const getCompletionIcon = (kind: CompletionItemKind) => {
  if (kind === CompletionItemKind.Text) return Icon('shield')
  if (kind === CompletionItemKind.Method) return Icon('box', { color: '#bb5ef1' })
  if (kind === CompletionItemKind.Property) return Icon('disc', { color: '#54c8ff' })
  else return Icon('code')
}

const docs = (data: string) => Row.normal({
  style: {
    overflow: 'visible',
    whiteSpace: 'normal',
    background: '#1e1e1e',
    paddingTop: '4px',
    paddingBottom: '4px',
    fontSize: `${canvasContainer.font.size - 2}px`,
    color: 'rgba(255, 255, 255, 0.5)',
  }
}, data)

const view = ({ options, anchorAbove, documentation, vis, ix, x, y }: State) => h('#autocomplete', {
  hide: !vis,
  style: {
    zIndex: 200,
    minWidth: '100px',
    maxWidth: '600px',
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  documentation && anchorAbove ? docs(documentation) : undefined,

  h('div', {
    onupdate: (e: HTMLElement) => pos.container = e.getBoundingClientRect(),
    style: {
      background: panelColors.bg,
      overflowY: 'hidden',
      transform: anchorAbove ? 'translateY(-100%)' : undefined,
      maxHeight: `${canvasContainer.cell.height * MAX_VISIBLE_OPTIONS}px`,
    }
  }, options.map(({ text, kind }, id) => Row.complete({
    key: id,
    activeWhen: id === ix,
    onupdate: (e: HTMLElement) => {
      if (id !== ix) return
      const { top, bottom } = e.getBoundingClientRect()
      if (top < pos.container.top) return e.scrollIntoView(true)
      if (bottom > pos.container.bottom) return e.scrollIntoView(false)
    }
  }, [
    h('div', {
      style: {
        display: 'flex',
        marginLeft: '-8px',
        background: 'rgba(255, 255, 255, 0.03)',
        // TODO: this doesn't scale with font size?
        // TODO: shouldn't there be different fonts for UI vs vim
        width: '24px',
        marginRight: '8px',
        alignItems: 'center',
        justifyContent: 'center',
      }
    }, [
      getCompletionIcon(kind),
    ]),
    h('div', text)
  ]))),

  documentation && !anchorAbove ? docs(documentation) : undefined,
])

const a: Actions<State> = {}

a.show = (_s, _a, { anchorAbove, options, x, y, ix = -1 }) => ({ anchorAbove, options, ix, x, y, vis: true, documentation: undefined })
a.showDocs = (_s, _a, documentation) => ({ documentation })
a.hide = () => ({ vis: false, ix: 0 })
a.select = (s, a, ix: number) => {
  const completionItem = (s.options[ix] || {}).raw

  if (completionItem) getCompletionDetail(completionItem)
    .then(m => m.documentation && a.showDocs(m.documentation))

  return { ix, documentation: undefined }
}

const ui = app({ state, view, actions: a }, false)

export const hide = () => ui.hide()
export const select = (index: number) => ui.select(index)
export const showDocs = (documentation: string) => ui.showDocs(documentation)
export const show = ({ row, col, options }: ShowParams) => {
  const visibleOptions = Math.min(MAX_VISIBLE_OPTIONS, options.length)
  const anchorAbove = cursor.row + visibleOptions > canvasContainer.size.rows 

  ui.show({
    options,
    anchorAbove,
    x: activeWindow() ? activeWindow()!.colToX(col) : 0,
    y: activeWindow() ? activeWindow()!.rowToTransformY(anchorAbove ? row : row + 1) : 0,
  })
}
