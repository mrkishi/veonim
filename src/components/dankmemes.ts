import { makel, addCSS } from '../ui/vanilla'
import { hslToHex } from '../ui/css'
import { h, app } from '../ui/uikit'

const cc = document.getElementById('canvas-container') as HTMLElement
const container = makel({
  position: 'absolute',
  display: 'flex',
})
cc.appendChild(container)

const state = {
  hue: 123,
  saturation: 100,
  lightness: 50,
  alpha: 1,
}

const actions = {
  updateColors: (m: object) => m,
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
    height: '12px',
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
  },
  arrow: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '0.5rem',
  }
}

const stats = {
  hueSliderWidthMultiplier: 2.11,
  alphaSliderWidth: 170,
}

const updateOnMove = (e: HTMLElement, updateFn: (e: MouseEvent) => void) => {
  const onMove = (m: MouseEvent) => updateFn(m)
  e.addEventListener('mousedown', ev => (updateFn(ev), e.addEventListener('mousemove', onMove)))
  e.addEventListener('mouseup', () => e.removeEventListener('mousemove', onMove))
}

const getDimensions = (e: MouseEvent, container: HTMLElement) => ({
  left: e.pageX - (container.getBoundingClientRect().left + window.pageXOffset),
  width: container.clientWidth,
})

const calc = {
  hue: (e: MouseEvent, container: HTMLElement) => {
    const { left, width } = getDimensions(e, container)

    if (left < 0) return 0
    else if (left > width) return 359
    else return (360 * ((left * 100) / width)) / 100
  },
  alpha: (e: MouseEvent, container: HTMLElement) => {
    const { left, width } = getDimensions(e, container)

    if (left < 0) return 0
    else if (left > width) return 1
    else return Math.round((left * 100) / width) / 100
  },
  saturation: (e: MouseEvent, container: HTMLElement) => {
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect()
    let left = e.pageX - (container.getBoundingClientRect().left + window.pageXOffset)
    let top = e.pageY - (container.getBoundingClientRect().top + window.pageYOffset)

    if (left < 0) left = 0
    else if (left > containerWidth) left = containerWidth
    else if (top < 0) top = 0
    else if (top > containerHeight) top = containerHeight

    const saturation = (left * 100) / containerWidth
    const lightness = -((top * 100) / containerHeight) + 100

    return { saturation, lightness }
  }
}

const hueSlider = ($: S, a: A) => h('div', {
  style: {
    ...styles.slider,
    background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
  },
  oncreate: (e: HTMLElement) => {
    stats.hueSliderWidthMultiplier = 360 / e.clientWidth
    updateOnMove(e, ev => a.updateColors({ hue: calc.hue(ev, e) }))
  },
}, [
  ,h('div', {
    style: {
      ...styles.sliderHandle,
      transform: `translate(${($.hue / stats.hueSliderWidthMultiplier) - 8}px, -2px)`,
    }
  })
])

const alphaSlider = ($: S, a: A) => h('div', {
  style: {
    ...styles.slider,
    background: `linear-gradient(to right, rgba(0, 0, 0, 0), hsl(${$.hue}, ${$.saturation}%, ${$.lightness / 2}%))`,
  },
  oncreate: (e: HTMLElement) => {
    stats.alphaSliderWidth = e.clientWidth
    updateOnMove(e, ev => a.updateColors({ alpha: calc.alpha(ev, e) }))
  },
}, [
  ,h('div', {
    style: {
      ...styles.sliderHandle,
      transform: `translate(${($.alpha * stats.alphaSliderWidth) - 8}px, -2px)`,
    }
  })
])

const hexValue = ($: S) => h('div', {
  style: {
    flex: 1,
    display: 'flex',
    flexFlow: 'column',
  }
}, [
  ,h('div', {
    style: {
      flex: 1,
      display: 'flex',
      paddingTop: '8px',
      paddingBottom: '8px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '0.9rem',
      color: '#ccc',
    }
  }, hslToHex($.hue, $.saturation, $.lightness))

  ,h('div', {
    style: {
      display: 'flex',
      marginTop: '8px',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '0.8rem',
      color: '#888',
    }
  }, 'HEX')
])

addCSS(`
  .switch-button {
    outline: none;
    background: none;
    border: none;
    padding-top: 8px;
    padding-bottom: 8px;
    padding-left: 10px;
    padding-right: 10px;
    margin-left: -5px;
  }

  .switch-button:hover {
    background: rgba(255, 255, 255, 0.4);
    border-radius: 2px;
    border-color: none;
  }
`)

const switchValues = ($: S, a: A) => h('div', {
  style: {
    display: 'flex',
    flexFlow: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: '8px',
  }
}, [
  ,h('.switch-button', [

    ,h('div', { style: styles.arrow }, [
      ,h('svg', {
        viewBox: '0 0 30 20',
        height: '1em',
        width: '1em',
        fill: 'currentColor',
      }, [
        ,h('polygon', { points: '15,0 0,20 30,20' })
      ])
    ])

    ,h('div', { style: styles.arrow }, [
      ,h('svg', {
        viewBox: '0 0 30 20',
        height: '1em',
        width: '1em',
        fill: 'currentColor',
      }, [
        ,h('polygon', { points: '30,0 0,0 15,20' })
      ])
    ])

  ])
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
      },
      oncreate: (e: HTMLElement) => updateOnMove(e, ev => {
        const { saturation, lightness } = calc.saturation(ev, e)
        a.updateColors({ saturation, lightness })
      })
    }, [

      ,h('div', {
        style: {
          ...styles.overlay,
          background: `hsl(${$.hue}, 100%, 50%)`,
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
          top: `${-($.lightness) + 100}%`,
          left: `${$.saturation}%`,
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
          background: `hsla(${$.hue}, ${$.saturation}%, ${$.lightness / 2}%, ${$.alpha})`,
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

  ,h('div', {
    style: {
      display: 'flex',
      padding: '15px',
    }
  }, [

    ,hexValue($)
    ,switchValues($, a)

  ])
])

app({ name: 'dank-memes', state, actions, view, element: container })
