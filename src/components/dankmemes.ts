import { makel } from '../ui/vanilla'
import { h, app } from '../ui/uikit'

const cc = document.getElementById('canvas-container')
const container = makel({
  position: 'absolute',
  display: 'flex',
})
cc.appendChild(container)

const state = {
  hue: 123,
  saturation: 50,
  lightness: 100,
  alpha: 1,
}

const actions = {
  // updateColors: m => m,
  updateColors: m => {
    console.log(m)
    return m
  },
}

type S = typeof state
type A = typeof actions

const styles = {
  overlay: {
    height: '100%',
    width: '100%',
    position: 'absolute',
  },
  slider: {
    height: '14px',
    width: '100%',
    borderRadius: '2px',
  },
  sliderHandle: {
    position: 'absolute',
    height: '16px',
    width: '16px',
    background: '#222',
    borderRadius: '50%',
    boxShadow: '1px 1px 0.3px rgba(0, 0, 0, 0.2)',
  }
}

const stats = {
  hueSliderWidthMultiplier: 2.11,
  alphaSliderWidth: 170,
}

const mouseEv = (e: HTMLElement, updateFn: Function) => {
  e.preventDefault()
  const onMouseMove = m => updateFn(m)

  const onMouseUp = m => {
    e.target.removeEventListener('mousemove', onMouseMove)
    e.target.removeEventListener('mouseup', onMouseUp)
  }

  e.target.addEventListener('mousemove', onMouseMove)
  e.target.addEventListener('mouseup', onMouseUp)

  updateFn(e)
}

const getDimensions = (e, container) => {
  const x = typeof e.pageX === 'number' ? e.pageX : e.touches[0].pageX
  const left = x - (container.getBoundingClientRect().left + window.pageXOffset)
  return { left, width: container.clientWidth }
}

const calc = {
  hue: (e, container) => {
    const { left, width } = getDimensions(e, container)

    if (left < 0) return 0
    else if (left > width) return 359
    else return (360 * ((left * 100) / width)) / 100
  },
  alpha: (e, container) => {
    const { left, width } = getDimensions(e, container)

    if (left < 0) return 0
    else if (left > width) return 1
    else return Math.round((left * 100) / width) / 100
  },
}

const hueSlider = ($: S, a: A) => h('div', {
  style: {
    ...styles.slider,
    background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
  },
  oncreate: e => stats.hueSliderWidthMultiplier = 360 / e.clientWidth,
  onmousedown: e => mouseEv(e, el => a.updateColors({ hue: calc.hue(el, e.target) })),
}, [
  ,h('div', {
    style: {
      ...styles.sliderHandle,
      transform: `translateX(${($.hue / stats.hueSliderWidthMultiplier) - 8}px)`,
    }
  })
])

const alphaSlider = ($: S, a: A) => h('div', {
  style: {
    ...styles.slider,
    background: `linear-gradient(to right, rgba(0, 0, 0, 0), hsl(${$.hue}, ${$.saturation}%, ${$.lightness}%))`,
  },
  oncreate: e => stats.alphaSliderWidth = e.clientWidth,
  onmousedown: e => mouseEv(e, el => a.updateColors({ alpha: calc.alpha(el, e.target) })),
}, [
  ,h('div', {
    style: {
      ...styles.sliderHandle,
      transform: `translateX(${($.alpha * stats.alphaSliderWidth) - 8}px)`,
    }
  })
])

const view = ($: S, a: A) => h('div', {
  style: {
    borderRadius: '2px',
    boxShadow: '0 0 2px rgba(0,0,0,.3), 0 4px 8px rgba(0,0,0,.3)',
    boxSizing: 'initial',
    width: '250px',
    // TODO: DIRTY HACK FOR VEONIM NOT NEEDED IN COMPONENT!!!!
    // TODO: DIRTY HACK FOR VEONIM NOT NEEDED IN COMPONENT!!!!
    // TODO: DIRTY HACK FOR VEONIM NOT NEEDED IN COMPONENT!!!!
    // TODO: DIRTY HACK FOR VEONIM NOT NEEDED IN COMPONENT!!!!
    // TODO: DIRTY HACK FOR VEONIM NOT NEEDED IN COMPONENT!!!!
    // TODO: DIRTY HACK FOR VEONIM NOT NEEDED IN COMPONENT!!!!
    zIndex: 99999999999,
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

      ,h('div', {
        style: {
          position: 'absolute',
          top: '30%',
          left: '30%',
        }
      }, [
        ,h('div', {
          style: {
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            transform: 'translate(-6px, -6px)',
            boxShadow: 'rgb(255, 255, 255) 0px 0px 0px 1px inset',
          }
        })
      ])

    ])

  ])

  ,h('div', {
    style: {
      display: 'flex',
      padding: '15px',
    }
  }, [

    ,h('div', {
      style: {
        display: 'flex',
        flex: 1,
      }
    }, [

      ,h('div', {
        style: {
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'red',
        }
      })

      ,h('div', {
        style: {
          flex: 1,
          display: 'flex',
          marginLeft: '10px',
          flexFlow: 'column',
          justifyContent: 'space-between',
        }
      }, [
        ,hueSlider($, a)
        ,alphaSlider($, a)
      ])

    ])
  ])
])

const ui = app({ name: 'dank-memes', state, actions, view, element: container })
