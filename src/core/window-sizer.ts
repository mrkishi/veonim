import { size } from '../core/canvas-container'
import { WindowInfo } from '../core/window'

const getSplits = (wins: WindowInfo[]) => {
  const vertical = new Set<number>()
  const horizontal = new Set<number>()
  wins.forEach(w => (vertical.add(w.col), horizontal.add(w.row)))
  return { vertical, horizontal }
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

export default (wins: WindowInfo[]) => {
  // TODO: should we use teh size (rows/cols) from grid 1?
  const totalRows = size.rows - 1
  const totalColumns = size.cols
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
      start: w.col,
      end: w.col + w.width === totalColumns ? w.col + w.width : w.col + w.width + 1,
    },
    row: {
      start: w.row,
      end: w.row + w.height === totalRows ? w.row + w.height : w.row + w.height + 1,
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
    windowGridInfo: windowsWithGridInfo,
  }
}
