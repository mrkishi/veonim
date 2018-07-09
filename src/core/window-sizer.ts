export const calcGridContainer = () => {

}

export const calcGridPositions = () => {

}

const getSplits = (wins: VimWindow[]) => {
  const vertical = new Set<number>()
  const horizontal = new Set<number>()
  wins.forEach(w => (vertical.add(w.x), horizontal.add(w.y)))
  return { vertical, horizontal }
}

const getSplitCount = (wins: VimWindow[]) => {
  const { vertical, horizontal } = getSplits(wins)
  return { vertical: vertical.size - 1, horizontal: horizontal.size - 1 }
}

const within = (target: number, tolerance: number) => (candidate: number) =>
  Math.abs(target - candidate) <= tolerance

const equalizeTo100 = (percentages: number[]) => {
  const total = percentages.reduce((total, num) => total + num, 0)
  if (total >= 100) return percentages

  const remainTo100 = 100 - total
  const items = percentages.slice()
  items[0] += remainTo100
  return items
}

const gogrid = (wins: VimWindow[]): GridInfo => {
  const totalRows = canvasContainer.size.rows - 1
  const totalColumns = canvasContainer.size.cols
  const { vertical, horizontal } = getSplits(wins)

  vertical.add(totalColumns)
  horizontal.add(totalRows)

  const yrows = [...horizontal].sort((a, b) => a - b)
  const xcols = [...vertical].sort((a, b) => a - b)

  const rr = yrows.reduce((res, curr, ix, arr) => {
    if (ix === arr.length - 1) return res

    const next = arr[ix + 1]
    const diff = next - curr
    const rowSize = <any>Math.round((diff / totalRows) * 100).toFixed(1) - 0
    return [...res, rowSize]
  }, [] as number[])

  const cc = xcols.reduce((res, curr, ix, arr) => {
    if (ix === arr.length - 1) return res

    const next = arr[ix + 1]
    const diff = next - curr
    const rowSize = <any>Math.round((diff / totalColumns) * 100).toFixed(1) - 0
    return [...res, rowSize]
  }, [] as number[])

  const gridTemplateRows = rr.length < 2 ? '100%' : rr.reduce((s, m) => s + m + '% ', '')
  const gridTemplateColumns = cc.length < 2 ? '100%' : equalizeTo100(cc).reduce((s, m) => s + m + '% ', '')

  const windowsWithGridInfo = wins.map(w => ({
    ...w,
    col: {
      start: w.x,
      end: w.x + w.width === totalColumns ? w.x + w.width : w.x + w.width + 1,
    },
    row: {
      start: w.y,
      end: w.y + w.height === totalRows ? w.y + w.height : w.y + w.height + 1,
    }
  })).map(w => {
    const rowStart = yrows.findIndex(within(w.row.start, 2)) + 1
    const rowEnd = yrows.findIndex(within(w.row.end, 2)) + 1
    const colStart = xcols.findIndex(within(w.col.start, 2)) + 1
    const colEnd = xcols.findIndex(within(w.col.end, 2)) + 1

    return {
      ...w,
      gridColumn: `${colStart} / ${colEnd}`,
      gridRow: `${rowStart} / ${rowEnd}`,
    }
  })

  return {
    gridTemplateRows,
    gridTemplateColumns,
    windows: windowsWithGridInfo,
  }
}

const { gridTemplateRows, gridTemplateColumns, windows: renderWindows } = gogrid(wins)
merge(container.style, { gridTemplateRows, gridTemplateColumns })

merge(element.style, {
  display: 'flex',
  gridColumn: win.gridColumn,
  gridRow: win.gridRow,
})
