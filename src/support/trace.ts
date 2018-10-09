const LANGSERV = process.env.VEONIM_TRACE_LANGSERV || false

const log = (...msg: any[]) => console.debug(...msg)
export const traceLANGSERV = LANGSERV ? log : () => {}
