export let grid: any[][] = [[]]

export const resizeGrid = (rows: number, columns: number) => {
  console.log('resize rows:', rows, 'columns:', columns)
  grid = [...Array(rows)].map(() => [...Array(columns)])
}

(window as any).blarg = () => console.log(grid)
