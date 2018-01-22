import { systemAction } from '../core/neovim'

systemAction('job-output', (jobId: number, data: string[]) => {
  // TODO: if last line === "" then buffer complete. otherwise more to come!
  console.log(jobId, data.join('\n'))
})
