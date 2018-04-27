import { cvar } from '../ui/css'
import { h } from '../ui/uikit'

const base = {
  zIndex: 99,
  display: 'flex',
  width: '100%',
  justifyContent: 'center',
}

const normal = { ...base, alignItems: 'flex-start' }
const top = { ...base, alignItems: 'flex-start' }
const bottom = { ...base, alignItems: 'flex-end' }
const right = { ...base, alignItems: 'stretch', justifyContent: 'flex-end' }

const dialog = {
  background: cvar('background-40'),
  marginTop: '15%',
  flexFlow: 'column',
}

export const Plugin = (visible: boolean, children: any[]) => h('div', {
  style: normal,
}, [

  ,h('div', {
    style: {
      ...dialog,
      width: '600px',
      display: visible ? 'flex' : 'none',
    }
  }, children)

])

export const PluginTop = (visible: boolean, children: any[], styles?: object) => h('div', {
  style: top,
}, [

  ,h('div', {
    style: {
      ...dialog,
      ...styles,
      width: '400px',
      display: visible ? 'flex' : 'none',
    }
  }, children)

])

export const PluginBottom = (visible: boolean, children: any[]) => h('div', {
  style: bottom,
}, [

  ,h('div', {
    style: {
      display: visible ? 'flex' : 'none',
    }
  }, children)

])

export const PluginRight = (visible: boolean, children: any[]) => h('div', {
  style: right,
}, [

  ,h('div', {
    style: {
      ...dialog,
      width: '500px',
      height: '100%',
      flexFlow: 'column',
      marginTop: 0,
      display: visible ? 'flex' : 'none',
    }
  }, children)

])
