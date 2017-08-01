export interface VimBuffer {
  name: string,
  cur: boolean,
  mod: boolean
}

export interface Functions {
  Commands(): Promise<string[]>,
  Buffers(): VimBuffer[],
  getcwd(): Promise<string>,
  expand(type: string): string,
  synIDattr(id: number, type: string): Promise<number>
}
