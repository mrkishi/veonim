import nvim from '../core/neovim'

const bufferStacks = new Map<number, string[]>()
let activeWindow = 0

// TODO: how do we cleanup windows that no longer exist?
// ultimately i think we should tie this into render events
// with the new ext-windows. actually the new window classes
// can track bufferName history directly. when the window gets
// removed, so does the history for it. yeah i like that. lets do that

nvim.onAction('buffer-next', async () => {
  if (!bufferStacks.has(activeWindow)) return console.error('no buffer stacks - window does not exist. this should never happen')

  const stack = bufferStacks.get(activeWindow)!
  console.log('stack', stack)
})

nvim.onAction('buffer-prev', async () => {
  if (!bufferStacks.has(activeWindow)) return console.error('no buffer stacks - window does not exist. this should never happen')

  const stack = bufferStacks.get(activeWindow)!
  console.log('stack', stack)
})

nvim.on.winEnter(async id => {
  activeWindow = id
  const bufferName = await nvim.current.buffer.name

  if (!bufferStacks.has(id)) return bufferStacks.set(id, [ bufferName ])

  const stack = bufferStacks.get(id)!
  const lastItem = stack[stack.length - 1]
  if (lastItem !== bufferName) stack.push(bufferName)

  if (stack.length > 100) {
    const reducedStack = stack.slice(stack.length - 100)
    bufferStacks.set(id, reducedStack)
  }
})

nvim.on.bufLoad(async () => {
  if (!bufferStacks.has(activeWindow)) return console.error('can not add buffer to stack - no window present. this is not supposed to happen')

  const bufferName = await nvim.current.buffer.name
  const stack = bufferStacks.get(activeWindow)!
  const lastItem = stack[stack.length - 1]
  if (lastItem !== bufferName) stack.push(bufferName)

  if (stack.length > 100) {
    const reducedStack = stack.slice(stack.length - 100)
    bufferStacks.set(id, reducedStack)
  }
})

setTimeout(async () => {
  activeWindow = await nvim.current.window.id
  const currentBufferName = await nvim.current.buffer.name
  bufferStacks.set(activeWindow, [ currentBufferName ])
}, 1e3)
