import { homedir } from 'os'

export const explorer = {
  ignore: {
    dirs: ['.git'],
    files: ['.DS_Store'],
  },
  project: {
    root: homedir(),
  }
}

export const workspace = {
  ignore: {
    dirs: ['build', 'dist'],
  }
}
