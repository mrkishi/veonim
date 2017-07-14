import decurse, { Decurse } from 'decurse'

export interface Colors {
  muted: Decurse.Color,
  highlight: Decurse.Color,
  cursor?: {
    insert: Decurse.Color,
    normal: Decurse.Color
  }
}

export const colors: Colors = {
  muted: 243,
  cursor: {
    insert: 208,
    normal: 'white'
  },
  highlight: 214
}

export const { body, create } = decurse({
  cursor: {
    artificial: true,
    shape: {
      bg: 7,
      fg: 232
    }
  }
})

export const vimui = create.text({
  raw: true,
  height: '100%',
  width: '100%'
})

export const search = create.autocomplete({
  top: 10,
  left: 'center',
  width: 50,
  hidden: true,
  suggestOnEmpty: true,
  clearOnSelect: true,
  style: {
    fg: 'white',
    bg: 234,
    list: {
      item: {
        fg: 250,
        bg: 236
      },
      selected: {
        bold: true,
        bg: 237,
        fg: 231
      },
      bg: 236
    }
  }
})

export const render = body.render
export const makeAttr = vimui.makeAttr