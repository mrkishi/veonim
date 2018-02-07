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

const findPath = <T extends LocationItem>(items: T[], current: string, next: boolean): string => {
  const justPaths = items.map(m => m.path)
  const uniquePaths = [...new Set(justPaths)]
  const currentPathIndex = uniquePaths.indexOf(current)
  const nextIndex = next
    ? currentPathIndex + 1 > uniquePaths.length - 1 ? 0 : currentPathIndex + 1
    : currentPathIndex - 1 < 0 ? uniquePaths.length - 1 : currentPathIndex - 1

  return Reflect.has(uniquePaths, currentPathIndex)
    ? Reflect.get(uniquePaths, nextIndex)
    : current
}

const setupItemPathFinder = <T extends LocationItem>(items: T[]) => (path: string) =>
  items.filter(m => m.path === path)

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

  const getItemsForPath = setupItemPathFinder(sortedItems)
  const currentItems = getItemsForPath(currentPath)

  const foundItem = findNext
    ? findNextItem(currentItems, line, column)
    : findPreviousItem(currentItems, line, column)

  if (foundItem) return foundItem.reference

  const nextOrPreviousPath = findPath(sortedItems, currentPath, findNext)
  const nextItems = getItemsForPath(nextOrPreviousPath)

  return findNext
    ? nextItems[0]
    : nextItems[nextItems.length - 1]
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
