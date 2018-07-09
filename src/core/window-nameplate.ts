import { size, font } from '../core/canvas-container'
import * as Icon from 'hyperapp-feather'
import { uuid } from '../support/utils'
import { makel } from '../ui/vanilla'
import { h, app } from '../ui/uikit'
import { cvar } from '../ui/css'

export interface NameplateState {
  name?: string
  dir?: string
  active?: boolean
  modified?: boolean
  terminal?: boolean
  termAttached?: boolean
  termFormat?: string
}

type S = NameplateState

export default () => {
  const element = makel({
    display: 'flex',
    overflow: 'hidden',
    height: `${size.nameplateHeight}px`,
    minHeight: `${size.nameplateHeight}px`,
  })

  const state: NameplateState = {
    name: '',
    dir: '',
    active: false,
    modified: false,
    terminal: false,
    termAttached: false,
    termFormat: '',
  }

  const actions = {
    updateStuff: (stuff: any) => stuff,
  }

  type A = typeof actions

  const view = ($: S) => h('div', {
    style: {
      // display: 'flex',
      paddingLeft: '10px',
      paddingRight: '10px',
      alignItems: 'center',
      maxWidth: 'calc(100% - 20px)',
      background: cvar('background'),
    }
  }, [

    // TODO: set icon size

    // terminal icon
    ,$.terminal && h(Icon.Terminal, {
      color: cvar('foreground-30'),
      style: {
        display: 'flex',
        marginRight: '8px',
        alignItems: 'center',
      }
    })

    // nameplate
    ,h('div', {
      style: {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }
    }, [

      ,h('span', { style: {
        color: cvar('foreground-50'),
      } }, $.name)

      ,h('span', { style: {
        color: cvar('foreground-30'),
        marginRight: '1px',
      } }, $.dir)

    ])

    // modified bubble
    ,$.modified && h('div', {
      style: {
        marginTop: '2px',
        marginLeft: '8px',
        borderRadius: '50%',
        background: cvar('foreground-50'),
        // TODO: use rem
        width: `${Math.round(font.size / 2)}px`,
        height: `${Math.round(font.size / 2)}px`,
      }
    })

    // TODO: set icon size
    // reader icon
    ,$.termAttached && h(Icon.Eye, {
      color: cvar('foreground-30'),
      style: {
        // display: 'flex',
        marginLeft: '15px',
        marginRight: '4px',
        alignItems: 'center',
      }
    })

    // reader type
    ,$.termAttached && h('div', {
      style: {
        color: cvar('foreground-50'),
        fontSize: '0.8rem',
      }
    }, $.termFormat)

  ])

  const ui = app<S, A>({ name: `nameplate-${uuid()}`, state, actions, view, element })
  const update = (stuff: any) => ui.updateStuff(stuff)

  return { element, update }
}
