import { exec } from 'child_process'
import { remote } from 'electron'
import { totalmem } from 'os'

interface Process {
  cmd: string
  pid: number
  cpu: number
  memory: number
}

interface ProcessStats {
	cmd: string
	pid: number
	parentPid: number
	load: number
	memory: number
}

interface ProcessItem extends ProcessStats {
  children?: ProcessItem[]
}

const MB = 1024 * 1024
const container = document.getElementById('process-list') as HTMLElement

const listProcesses = (rootPid: number): Promise<ProcessItem> => new Promise(done => {
  let rootItem: ProcessItem
  const map = new Map<number, ProcessItem>()

  const addToTree = ({ cmd, pid, parentPid, load, memory }: ProcessStats) => {
    const parent = map.get(parentPid)
    const isParent = pid === rootPid || parent
    if (!isParent) return

    const item: ProcessStats = {
      cmd,
      pid,
      parentPid,
      load,
      memory,
    }

    map.set(pid, item)

    if (pid === rootPid) rootItem = item

    if (parent) {
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(item)
      if (parent.children.length > 1) {
        parent.children = parent.children.sort((a, b) => a.pid - b.pid)
      }
    }
  }

  const CMD = '/bin/ps -ax -o pid=,ppid=,pcpu=,pmem=,command='
  const PID_CMD = /^\s*([0-9]+)\s+([0-9]+)\s+([0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+)\s+(.+)$/

  exec(CMD, { maxBuffer: 1000 * 1024 }, (err, stdout, stderr) => {
    if (err || stderr) return console.error(err || stderr.toString())

    stdout
      .toString()
      .split('\n')
      .map(line => {
        const [ , pid, ppid, load, mem, cmd ] = PID_CMD.exec(line.trim()) || [] as any
        const stats = {
          cmd,
          pid: parseInt(pid),
          parentPid: parseInt(ppid),
          load: parseFloat(load),
          memory: parseFloat(mem),
        }

        addToTree(stats)
      })

    done(rootItem)
  })
})

const findName = (cmd: string): string => {
  const SHARED_PROCESS_HINT = /--disable-blink-features=Auxclick/
  const WINDOWS_WATCHER_HINT = /\\watcher\\win32\\CodeHelper\.exe/
  const WINDOWS_CRASH_REPORTER = /--crashes-directory/
  const WINDOWS_PTY = /\\pipe\\winpty-control/
  const WINDOWS_CONSOLE_HOST = /conhost\.exe/
  const TYPE = /--type=([a-zA-Z-]+)/

  // find windows file watcher
  if (WINDOWS_WATCHER_HINT.exec(cmd)) return 'watcherService '

  // find windows crash reporter
  if (WINDOWS_CRASH_REPORTER.exec(cmd)) return 'electron-crash-reporter'

  // find windows pty process
  if (WINDOWS_PTY.exec(cmd)) return 'winpty-process'

  //find windows console host process
  if (WINDOWS_CONSOLE_HOST.exec(cmd)) return 'console-window-host (Windows internal process)'

  // find "--type=xxxx"
  let matches = TYPE.exec(cmd)
  if (matches && matches.length === 2) {
    if (matches[1] === 'renderer') {
      if (SHARED_PROCESS_HINT.exec(cmd)) {
        return 'shared-process'
      }

      return `window`
    }
    return matches[1]
  }

  // find all xxxx.js
  const JS = /[a-zA-Z-]+\.js/g
  let result = ''
  do {
    matches = JS.exec(cmd)
    if (matches) {
      result += matches + ' '
    }
  } while (matches)

    if (result) {
      if (cmd.indexOf('node ') !== 0) {
        return `electron_node ${result}`
      }
    }
  return cmd
}

const parseName = (cmd: string, pid: number): string => {
  // browser windows (renderer processes)
  if (pid === remote.process.pid) return 'Veonim'
  if (pid === process.pid) return 'window: Process Explorer'
  if (cmd.includes('background-color=#222')) return 'window: Main'

  // neovim
  if (cmd.includes('nvim') && cmd.includes('call rpcnotify')) return 'Neovim'
  if (cmd.includes('nvim') && cmd.includes('--cmd colorscheme veonim')) return 'Neovim - Auxillary Syntax Highlighter'
  if (cmd.includes('nvim') && cmd.includes('--cmd com! -nargs=+ -range Veonim 1')) return 'Neovim - "errorformat" Parser'

  return findName(cmd)
}

const objToItem = ({ cmd, pid, load, memory, children = [] }: ProcessItem, list: Process[], depth = 0) => {
  const mem = process.platform === 'win32'
    ? memory
    : (totalmem() * (memory / 100))

  const item: Process = {
    cmd: '&nbsp;'.repeat(depth * 4) + parseName(cmd, pid),
    cpu: Number(load.toFixed(0)),
    pid: Number((pid).toFixed(0)),
    memory: Number((mem / MB).toFixed(0)),
  }

  list.push(item)
  children.forEach(pi => objToItem(pi, list, depth + 1))
}

const processTreeToList = (processes: ProcessItem): Process[] => {
  let depth = 0
  let list = [] as Process[]
  objToItem(processes, list, depth)
  return list
}

const renderProcesses = (procs: Process[]) => {
  const head = `
    <tr>
      <th align="left">CPU %</th>
      <th align="left">Memory (MB)</th>
      <th align="left">PID</th>
      <th align="left">Name</th>
      <th align="left"></th>
      <th align="left"></th>
    </tr>`

  const body = procs.reduce((res, p) => {
    res += `
      <tr id=${p.pid}>
        <td align="center">${p.cpu}</td>
        <td align="center">${p.memory}</td>
        <td align="center" style="color: #999">${p.pid}</td>
        <td>${p.cmd}</td>
        <td><button id=${p.pid} action="kill">KILL</button></td>
        <td><button id=${p.pid} action="force-kill">FORCE KILL</button></td>
      </tr>`
    return res
  }, '')

  container.innerHTML = `<table>
    <thead>${head}</thead>
    <tbody>${body}</tbody>
  </table>`
}

container.addEventListener('click', e => {
  const el = e.target as HTMLElement
  const action = el.getAttribute('action')
  const id = el.getAttribute('id')

  if (!id) return alert('no PID exists for this process?? wat')
  if (!action) return alert('no kill action exists for this process?? wat')

  const kaput = action === 'force-kill'
    ? 'SIGKILL'
    : 'SIGTERM'

  process.kill(<any>id-0, kaput)
})

const refresh = async () => {
  const processTree = await listProcesses(remote.process.pid)
  const processList = processTreeToList(processTree)
  renderProcesses(processList)
}

refresh()
setInterval(refresh, 1200)
