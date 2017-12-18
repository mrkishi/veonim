import { CompletionOption, getCompletionDetail } from '../ai/completions'
import { CompletionItemKind } from 'vscode-languageserver-types'
import { h, app, Actions } from '../ui/uikit'
import vimUI from '../core/canvasgrid'
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
  x: number,
  y: number,
  options: CompletionOption[],
  anchorAbove: boolean,
}

const state: State = {
  anchorAbove: false,
  options: [],
  vis: false,
  ix: 0,
  x: 0,
  y: 0,
}

const getCompletionIcon = (kind: CompletionItemKind) => {
  if (kind === CompletionItemKind.Text) return Icon('shield')
  if (kind === CompletionItemKind.Method) return Icon('box', '#bb5ef1')
  if (kind === CompletionItemKind.Property) return Icon('disc', '#54c8ff')
  else {
    console.warn('please implement icon for:', kind)
    return Icon('code')
  }
}

const docs = (data: string) => h('.row', {
  style: {
    overflow: 'visible',
    whiteSpace: 'normal',
    background: '#1e1e1e',
    paddingTop: '4px',
    paddingBottom: '4px',
    fontSize: `${vimUI.fontSize - 2}px`,
    color: 'rgba(255, 255, 255, 0.5)',
  }
}, data)

const view = ({ options, anchorAbove, documentation, vis, ix, x, y }: State) => h('#autocomplete', {
  hide: !vis,
  style: {
    'z-index': 200,
    'min-width': '100px',
    'max-width': '300px',
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  documentation && anchorAbove ? docs(documentation) : undefined,

  h('div', options.map(({ text, kind }, id) => h('.row.complete', {
    key: id,
    css: { active: id === ix },
    style: {
      display: 'flex',
    }
  }, [
    h('div', {
      style: {
        display: 'flex',
        'margin-left': '-8px',
        background: 'rgba(255, 255, 255, 0.03)',
        width: '24px',
        'margin-right': '8px',
        'align-items': 'center',
        'justify-content': 'center',
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

export const show = (params: ShowParams) => ui.show(params)
export const select = (index: number) => ui.select(index)
export const hide = () => ui.hide()
export const showDocs = (documentation: string) => ui.showDocs(documentation)
