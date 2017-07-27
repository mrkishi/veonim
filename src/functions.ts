export interface VimBuffer {
  name: string,
  cur: boolean,
  mod: boolean
}

export interface Functions {
  Buffers(): VimBuffer[],
  getcwd(): Promise<string>,
  expand(type: string): string,
  synIDattr(id: number, type: string): Promise<number>
}
