export interface VimBuffer {
  name: string,
  cur: boolean,
  mod: boolean
}

export interface Functions {
  Buffers(): VimBuffer[],
  getcwd(): string,
  expand(type: string): string,
  synIDattr(id: number, type: string): number
}
