import { EMPTY_CHAR, EMPTY_HIGHLIGHT } from '../support/constants'

interface Cell {
  char: string
  hlid: number
}

type Line = Cell[]

const grids = new Map<number, Line[]>()

const getGrid = (id: number) => {
  const grid = grids.get(id)
  if (!grid) throw new Error(`grid ${id} does not exist. this is bad`)
  return grid
}

export const get = (id: number, row: number, col: number): Cell => {
  const grid = getGrid(id)
  return (grid[row] || [])[col] || []
}

export const getLine = (id: number, row: number, start: number, end: number): Cell[] => {
  const grid = getGrid(id)
  return grid[row].slice(start, end) || []
}

export const destroy = (id: number) => grids.delete(id)

export const resize = (id: number, rows: number, columns: number) => {
  const grid = grids.get(id) || []

  for (let xix = 0; xix <= rows; xix++) {
    let line: Line = []

    for (let yix = 0; yix <= columns; yix++) {
      // TODO: would it be faster to use Maps?
      line[yix] = { char: EMPTY_CHAR, hlid: EMPTY_HIGHLIGHT }
    }

    grid[xix] = line
  }

  if (!grids.has(id)) grids.set(id, grid)
}

export const set = (id: number, row: number, col: number, char: string, hlid: number) => {
  const grid = getGrid(id)

  grid[row][col].char = char
  grid[row][col].hlid = hlid
}

export const setLine = (id: number, row: number, start: number, end: number, char: string, hlid: number) => {
  const grid = getGrid(id)

  for (let col = start; col < end; col++) {
    grid[row][col].char = char
    grid[row][col].hlid = hlid
  }
}

export const moveRegionDown = (id: number, amount: number, top: number, bottom: number, left: number, right: number) => {
  const grid = getGrid(id)

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

export const moveRegionUp = (id: number, amount: number, top: number, bottom: number, left: number, right: number) => {
  const grid = getGrid(id)

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

export const clear = (id: number) => {
  const grid = getGrid(id)
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

export const clearLine = (id: number, row: number, start: number, end: number) => {
  const grid = getGrid(id)

  for (let col = start; col < end; col++) {
    grid[row][col].char = EMPTY_CHAR
    grid[row][col].hlid = EMPTY_HIGHLIGHT
  }
}
