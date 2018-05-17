import { ColorData } from '../services/colorizer'

interface FilterResult {
  line: string,
  start: {
    line: number,
    column: number,
  },
  end: {
    line: number,
    column: number,
  }
}

interface ColorizedFilterResult extends FilterResult {
  colorizedLine: ColorData[]
}

export default (data: ColorizedFilterResult, highlightColor: string) => {
  return data
}
