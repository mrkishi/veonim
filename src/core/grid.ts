import * as canvasContainer from '../core/canvas-container'

type Character = string
type Foreground = string
type Background = string
type Cell = [ Character, Foreground, Background ]

let grid: Cell[][] = [[]]

const resizeGrid = (rows: number, columns: number) => {
  grid = [...Array(rows)].map(() => [...Array(columns)].map(() => [' ', defaults.fg, defaults.bg] as Cell))
}

export const defaults = { fg: '', bg: '' }
export const setForeground = (fg: string) => defaults.fg = fg
export const setBackground = (bg: string) => defaults.bg = bg

export const get = (row: number, col: number): Cell => grid[row][col]

export const set = (row: number, col: number, char: string, fg = defaults.fg, bg = defaults.bg) => {
  grid[row][col][0] = char
  grid[row][col][1] = fg
  grid[row][col][2] = bg
}

export const moveRegionDown = (amt: number, top: number, bottom: number, left: number, right: number) => {
  for (let yix = bottom; yix - amt >= top; yix--) {
    const line = grid[yix]
    const sourceLine = grid[yix - amt]

    for (let xix = left; xix <= right; xix++) {
      if (yix === top) {
        line[xix][0] = ' '
        line[xix][1] = defaults.fg
        line[xix][2] = defaults.bg
      } else {
        if (!sourceLine) continue
        line[xix][0] = sourceLine[xix][0]
        line[xix][1] = sourceLine[xix][1]
        line[xix][2] = sourceLine[xix][2]
        sourceLine[xix][0] = ' '
        sourceLine[xix][1] = defaults.fg
        sourceLine[xix][2] = defaults.bg
      }
    }
  }
}

export const moveRegionUp = (amt: number, top: number, bottom: number, left: number, right: number) => {
  for (let yix = top; yix + amt <= bottom; yix++) {
    const line = grid[yix]
    const sourceLine = grid[yix + amt]

    for (let xix = left; xix <= right; xix++) {
      if (yix === bottom) {
        line[xix][0] = ' '
        line[xix][1] = defaults.fg
        line[xix][2] = defaults.bg
      }
      else {
        if (!sourceLine) continue
        line[xix][0] = sourceLine[xix][0]
        line[xix][1] = sourceLine[xix][1]
        line[xix][2] = sourceLine[xix][2]
        sourceLine[xix][0] = ' '
        sourceLine[xix][1] = defaults.fg
        sourceLine[xix][2] = defaults.bg
      }
    }
  }
}

export const clear = () => {
  const totalLines = grid.length

  for (let lineIx = 0; lineIx < totalLines; lineIx++) {
    const line = grid[lineIx]
    const lineLength = line.length

    for (let charIx = 0; charIx < lineLength; charIx++) {
      line[charIx][0] = ' '
      line[charIx][1] = defaults.fg
      line[charIx][2] = defaults.bg
    }
  }
}

export const clearLine = (row: number, col: number) => {
  const line = grid[row]
  const lineLength = line.length

  for (let charIx = col; charIx < lineLength; charIx++) {
    line[charIx][0] = ' '
    line[charIx][1] = defaults.fg
    line[charIx][2] = defaults.bg
  }
}

canvasContainer.on('resize', ({ rows, cols }) => resizeGrid(rows, cols))
