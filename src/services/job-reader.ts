import { systemAction } from '../core/neovim'

const bufferings = new Map<number, string[]>()
const buffer = (id: number, stuff: string[]) => bufferings.has(id)
  ? bufferings.get(id)!.push(...stuff)
  : bufferings.set(id, stuff)

systemAction('job-output', (jobId: number, data: string[]) => {
  const lastLine = data[data.length - 1]

  if (lastLine === '') {
    const prevMsg = bufferings.get(jobId) || []
    bufferings.delete(jobId)
    const msg = [...prevMsg, ...data]
    console.log(msg.join('\n'))
  }

  else buffer(jobId, data)
})

//const tscformat = `%E%f %#(%l\,%c): error %m,%E%f %#(%l\,%c): %m,%Eerror %m,%C%\s%\+%m`
