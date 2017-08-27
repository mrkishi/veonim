export interface VimBuffer {
  name: string,
  cur: boolean,
  mod: boolean
}

type WindowPosition = [ string, number, number, number ]

export interface Functions {
  Commands(): Promise<string[]>,
  Buffers(): VimBuffer[],
  OpenPaths(): Promise<string[]>,
  getcwd(): Promise<string>,
  getline(type: string | number, end?: string): Promise<string | string[]>,
  expand(type: string): string,
  synIDattr(id: number, type: string): Promise<number>,
  getpos(where: string): Promise<WindowPosition>,
}
