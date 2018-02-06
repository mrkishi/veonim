export interface Distance<T> {
  reference: T,
  lines: number,
  characters: number,
}

export interface LocationItem {
  path: string,
  line: number,
  col: number,
}

const distanceAsc = <T>(a: Distance<T>, b: Distance<T>) =>
  a.lines === b.lines ? a.characters < b.characters : a.lines < b.lines

const distanceDesc = <T>(a: Distance<T>, b: Distance<T>) =>
  a.lines === b.lines ? a.characters > b.characters : a.lines > b.lines

const orderDesc = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())

const findClosest = <T extends LocationItem>(
  items: T[],
  currentPath: string,
  line: number,
  column: number,
  findNext: boolean,
) => {
  const sortedItems = items.sort((a, b) => orderDesc(a.path, b.path))

  const distances = sortedItems.map(r => ({
    reference: r,
    lines: r.line - line,
    characters: r.col - column,
  } as Distance<T>))

  const sortedDistances = distances.sort((a, b) => findNext
    ? distanceDesc(a, b) ? 1 : 0
    : distanceAsc(a, b) ? 1 : 0)

  const validItem = findNext
    ? sortedDistances.find(m => m.lines === 0 ? m.characters > 0 : m.lines > 0)
    : sortedDistances.find(m => m.lines === 0 ? m.characters < 0 : m.lines < 0)

  return (validItem || {} as Distance<T>).reference
}

export const findNext = <T extends LocationItem>(
  items: T[],
  currentPath: string,
  line: number,
  column: number,
) => findClosest(items, currentPath, line, column, true)

export const findPrevious = <T extends LocationItem>(
  items: T[],
  currentPath: string,
  line: number,
  column: number,
) => findClosest(items, currentPath, line, column, false)
