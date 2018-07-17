import { makel } from '../ui/vanilla'
import { h, app } from '../ui/uikit'

const cc = document.getElementById('canvas-container')
const container = makel({
  position: 'absolute',
  display: 'flex',
})
cc.appendChild(container)

const state = {}
const actions = {}
type S = typeof state
type A = typeof actions

const styles = {
  overlay: {
    height: '100%',
    width: '100%',
    position: 'absolute',
  }
}

const view = ($: S) => h('div', {
  style: {
    borderRadius: '2px',
    boxShadow: '0 0 2px rgba(0,0,0,.3), 0 4px 8px rgba(0,0,0,.3)',
    boxSizing: 'initial',
    width: '225px',
    height: '250px',
    background: '#333',
  }
}, [
  ,h('div', {
    style: {
      height: '125px',
      display: 'flex',
    }
  }, [
    ,h('div', {
      style: {
        position: 'relative',
        flex: 1,
      }
    }, [

      ,h('div', {
        style: {
          ...styles.overlay,
          background: 'rgb(255, 0, 0)',
        }
      })

      ,h('div', {
        style: {
          ...styles.overlay,
          background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))',
        }
      })

      ,h('div', {
        style: {
          ...styles.overlay,
          background: 'linear-gradient(to top, #000, rgba(0,0,0,0))',
        }
      })

    ])

  ])
  ,h('span', 'dame tu cosita'),
])

const ui = app({ name: 'dank-memes', state, actions, view, element: container })
