import * as glob from 'globby'

const files = (cwd: string): Promise<string[]> => glob('**', {
  cwd,
  nosort: true,
  nodir: true,
  ignore: [
    '**/node_modules/**',
    '**/*.png',
    '**/*.jpg',
    '**/*.gif',
  ]
})

export default files