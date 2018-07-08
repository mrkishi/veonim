import { EMPTY_CHAR, EMPTY_HIGHLIGHT } from '../support/constants'

interface Cell {
  char: string
  hlid: number
}

type Line = Cell[]

export interface WindowGrid {
  getCell(row: number, col: number): Cell
  setCell(row: number, col: number, char: string, hlid: number): void
  getLine(row: number, start?: number, end?: number): Cell[]
  setLine(row: number, start: number, end: number, char: string, hlid: number): void
  resize(rows: number, cols: number): void
  clearLine(row: number, start?: number, end?: number): void
  clear(): void
  moveRegionUp(amount: number, top: number, bottom: number, left: number, right: number): void
  moveRegionDown(amount: number, top: number, bottom: number, left: number, right: number): void
}

export default () => {
  const grid: Line[] = []
  const api = {} as WindowGrid

  api.getCell = (row, col) => (grid[row] || [])[col] || []
  api.setCell = (row, col, char, hlid) => {
    grid[row][col].char = char
    grid[row][col].hlid = hlid
  }

  api.getLine = (row, start = 0, end) => {
    if (!end) return grid[row].slice(start)
    return grid[row].slice(start, end)
  }

  api.setLine = (row, start, end, char, hlid) => {
    for (let col = start; col < end; col++) {
      grid[row][col].char = char
      grid[row][col].hlid = hlid
    }
  }

  api.resize = (rows, cols) => {
    for (let xix = 0; xix <= rows; xix++) {
      let line: Line = []

      for (let yix = 0; yix <= cols; yix++) {
        line[yix] = { char: EMPTY_CHAR, hlid: EMPTY_HIGHLIGHT }
      }

      grid[xix] = line
    }
  }

  api.clearLine = (row, start = 0, end = grid[row].length) => {
    for (let col = start; col < end; col++) {
      grid[row][col].char = EMPTY_CHAR
      grid[row][col].hlid = EMPTY_HIGHLIGHT
    }
  }

  api.clear = () => {
    const totalLines = grid.length

    for (let lineIx = 0; lineIx < totalLines; lineIx++) {
      const line = grid[lineIx]
      const lineLength = line.length

      for (let charIx = 0; charIx < lineLength; charIx++) {
        line[charIx].char = EMPTY_CHAR
        line[charIx].hlid = EMPTY_HIGHLIGHT
      }
    }
  }

  api.moveRegionUp = (amount, top, bottom, left, right) => {
    for (let yix = top; yix + amount <= bottom; yix++) {
      const line = grid[yix]
      const sourceLine = grid[yix + amount]

      for (let xix = left; xix <= right; xix++) {
        if (yix === bottom) {
          line[xix].char = EMPTY_CHAR
          line[xix].hlid = EMPTY_HIGHLIGHT
        }
        else {
          if (!sourceLine) continue
          line[xix].char = sourceLine[xix].char
          line[xix].hlid = sourceLine[xix].hlid
          sourceLine[xix].char = EMPTY_CHAR
          sourceLine[xix].hlid = EMPTY_HIGHLIGHT
        }
      }
    }

  }

  api.moveRegionDown = (amount, top, bottom, left, right) => {
    for (let yix = bottom; yix - amount >= top; yix--) {
      const line = grid[yix]
      const sourceLine = grid[yix - amount]

      for (let xix = left; xix <= right; xix++) {
        if (yix === top) {
          line[xix].char = EMPTY_CHAR
          line[xix].hlid = EMPTY_HIGHLIGHT
        } else {
          if (!sourceLine) continue
          line[xix].char = sourceLine[xix].char
          line[xix].hlid = sourceLine[xix].hlid
          sourceLine[xix].char = EMPTY_CHAR
          sourceLine[xix].hlid = EMPTY_HIGHLIGHT
        }
      }
    }
  }

  return api
}
