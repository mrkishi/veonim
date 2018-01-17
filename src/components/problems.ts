import { h, app, style, Actions, ActionCaller, vimBlur, vimFocus } from '../ui/uikit'
import { DiagnosticSeverity } from 'vscode-languageserver-types'
import * as canvasContainer from '../core/canvas-container'
import { cmd, feedkeys, current } from '../core/neovim'
import { simplifyPath } from '../support/utils'
import { Row, Badge } from '../styles/common'
import Input from '../components/text-input'
import { Problem } from '../ai/diagnostics'
import { filter } from 'fuzzaldrin-plus'
import Icon from '../components/icon'
import { join } from 'path'

interface State {
  focus: boolean,
  val: string,
  problems: Problem[],
  cache: Problem[],
  vis: boolean,
  ix: number,
  subix: number,
}

let elref: HTMLElement
const SCROLL_AMOUNT = 0.4
const els = new Map<number, HTMLElement>()

// scroll after next section has been rendered as expanded (a little hacky)
const scrollIntoView = (next: number) => setTimeout(() => {
  const { top: containerTop, bottom: containerBottom } = elref.getBoundingClientRect()
  const e = els.get(next)
  if (!e) return

  const { top, height } = e.getBoundingClientRect()

  if (top + height > containerBottom) {
    const offset = top - containerBottom

    if (offset < containerTop) elref.scrollTop += top - containerTop
    else elref.scrollTop += offset + height + containerTop + 50
  }

  else if (top < containerTop) elref.scrollTop += top - containerTop
}, 1)

const selectResult = (results: Problem[], ix: number, subix: number) => {
  if (subix < 0) return
  const group: Problem = Reflect.get(results, ix)
  if (!group) return
  const { file, dir, items } = group
  const { range: { start: { line, character } } } = items[subix]

  const path = join(dir, file)
  cmd(`e ${path}`)
  feedkeys(`${line + 1}Gzz${character + 1}|`)
}

const state: State = {
  focus: false,
  val: '',
  problems: [],
  cache: [],
  vis: false,
  ix: 0,
  subix: 0,
}

const IconBox = style('div')({
  display: 'flex',
  alignItems: 'center',
  paddingRight: '10px',
})

const icons = {
  [DiagnosticSeverity.Error]: Icon('error', {
    color: '#ef2f2f',
    size: canvasContainer.font.size + 4,
  }),
  [DiagnosticSeverity.Warning]: Icon('error', {
    color: '#ffb100',
    size: canvasContainer.font.size + 4,
  })
}

const getSeverityIcon = (severity = 1) => Reflect.get(icons, severity)

const view = ($: State, actions: ActionCaller) => h('#problems', {
  style: {
    background: 'var(--background-45)',
    color: '#eee',
    display: $.vis ? 'flex' : 'none',
    flexFlow: 'column',
    position: 'absolute',
    alignSelf: 'flex-end',
    maxHeight: '30vh',
    width: '100%',
  }
}, [

  ,Input({
    ...actions,
    val: $.val,
    focus: $.focus,
    small: true,
    icon: 'filter',
    desc: 'filter by files',
  })

  ,h('div', {
    onupdate: (e: HTMLElement) => elref = e,
    style: { overflowY: 'hidden' }
  }, $.problems.map(({ file, dir, items }, pos) => h('div', {
    oncreate: (e: HTMLElement) => els.set(pos, e),
  }, [

    ,Row.header({ activeWhen: pos === $.ix }, [
      ,h('span', file),
      ,h('span', {
        style: {
          color: '#aaa',
          marginLeft: '10px',
          marginRight: '10px',
          fontSize: `${canvasContainer.font.size} - 2px`,
        }
      }, simplifyPath(dir, current.cwd)),
      ,Badge(items.length)
    ])

    ,pos === $.ix && Row.group({}, items.map(({ severity, message, range }, itemPos) => Row.normal({
      activeWhen: itemPos === $.subix,
    }, [
      ,IconBox({}, getSeverityIcon(severity))

      ,h('span', message)
      ,h('span', {
        style: { marginLeft: '10px' }
      }, `(${range.start.line}, ${range.start.character})`)
    ])))

  ])))
])

const a: Actions<State> = {}

a.toggle = s => ({ vis: !s.vis })
a.hide = () => (vimFocus(), { focus: false })
a.focus = () => (vimBlur(), { focus: true, vis: true })
a.updateProblems = (_s, _a, problems) => ({ problems, cache: problems })

a.change = (s, _a, val: string) => ({ val, problems: val
  ? filter(s.problems, val, { key: 'file' })
  : s.cache
})

a.nextGroup = s => {
  const next = s.ix + 1 > s.problems.length - 1 ? 0 : s.ix + 1
  scrollIntoView(next)
  return { subix: -1, ix: next }
}

a.prevGroup = s => {
  const next = s.ix - 1 < 0 ? s.problems.length - 1 : s.ix - 1
  scrollIntoView(next)
  return { subix: -1, ix: next }
}

a.next = s => {
  const items = (Reflect.get(s.problems, s.ix) || {}).items || []
  const next = s.subix + 1 < items.length ? s.subix + 1 : 0
  selectResult(s.problems, s.ix, next)
  return { subix: next }
}

a.prev = s => {
  const items = (Reflect.get(s.problems, s.ix) || {}).items || []
  const prev = s.subix - 1 < 0 ? items.length - 1 : s.subix - 1
  selectResult(s.problems, s.ix, prev)
  return { subix: prev }
}

a.down = () => {
  const { height } = elref.getBoundingClientRect()
  elref.scrollTop += Math.floor(height * SCROLL_AMOUNT)
}

a.up = () => {
  const { height } = elref.getBoundingClientRect()
  elref.scrollTop -= Math.floor(height * SCROLL_AMOUNT)
}

const ui = app({ state, view, actions: a }, false)

export const hide = () => ui.hide()
export const focus = () => ui.focus()
export const toggle = () => ui.toggle()
export const update = (problems: Problem[]) => ui.updateProblems(problems)
