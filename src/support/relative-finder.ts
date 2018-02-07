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

const orderAsc = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())
const orderDesc = (a: string, b: string) => b.toLowerCase().localeCompare(a.toLowerCase())

const locationItemAsDistance = (line: number, column: number) => <T extends LocationItem>(item: T) => ({
  reference: item,
  lines: item.line - line,
  characters: item.col - column,
} as Distance<T>)

const findNextItem = <T extends LocationItem>(items: T[], line: number, column: number) => {
  const distances = items.map(locationItemAsDistance(line, column))
  const sortedDistances = distances.sort((a, b) => distanceDesc(a, b) ? 1 : 0)
  return sortedDistances.find(m => m.lines === 0 ? m.characters > 0 : m.lines > 0)
}

const findPreviousItem = <T extends LocationItem>(items: T[], line: number, column: number) => {
  const distances = items.map(locationItemAsDistance(line, column))
  const sortedDistances = distances.sort((a, b) => distanceAsc(a, b) ? 1 : 0)
  return sortedDistances.find(m => m.lines === 0 ? m.characters < 0 : m.lines < 0)
}

const findClosest = <T extends LocationItem>(
  items: T[],
  currentPath: string,
  line: number,
  column: number,
  findNext: boolean,
) => {
  const sortedItems = items.sort((a, b) => findNext
    ? orderDesc(a.path, b.path)
    : orderAsc(a.path, b.path)
  )

  const currentItems = sortedItems.filter(m => m.path === currentPath)

  const foundItem = findNext
    ? findNextItem(currentItems, line, column)
    : findPreviousItem(currentItems, line, column)

  if (foundItem) return foundItem.reference

    // NEXT: go to the first item in the next path list.
    //    if next path does not exist, try the first path (which may be the current file again)
    //    retry findNext
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
