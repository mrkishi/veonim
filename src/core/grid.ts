//type Character = string
//type Foreground = number
//type Background = number

//type Cell = [ Character, Foreground, Background ]

export let grid: any[][] = [[]]

export const resizeGrid = (rows: number, columns: number) => {
  console.log('resize rows:', rows, 'columns:', columns)
  grid = [...Array(rows)].map(() => [...Array(columns)])
}

// TODO: TESTING ONLY
(window as any).blarg = () => console.log(grid)

export const moveRegionDown = (amt: number, top: number, bottom: number, left: number, right: number) => {
  for (let yix = bottom; yix - amt >= top; yix--) {
    const line = grid[yix]
    const sourceLine = grid[yix - amt]

    for (let xix = left; xix <= right; xix++) {
      if (yix === top) {
        line[xix] = ' '
      } else {
        if (!sourceLine) continue
        line[xix] = sourceLine[xix]
        sourceLine[xix] = ' '
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
        line[xix] = ' '
      }
      else {
        if (!sourceLine) continue
        line[xix] = sourceLine[xix]
        sourceLine[xix] = ' '
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
      line[charIx] = ' '
    }
  }
}

export const clearLine = (row: number, col: number) => {
  const line = grid[row]
  const total = line.length

  for (let ix = col; ix < total; ix++) {
    line[ix] = ' '
  }
}
