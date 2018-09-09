import { exec } from 'child_process'
import { remote } from 'electron'

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

const content = document.createElement('pre')
document.body.appendChild(content)

const listProcesses = (rootPid: number) => new Promise(done => {
  let rootItem: ProcessItem
  const map = new Map<number, ProcessItem>()

  function addToTree({ cmd, pid, parentPid, load, memory }: ProcessStats) {
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

  //function findName(cmd: string): string {
  //  const SHARED_PROCESS_HINT = /--disable-blink-features=Auxclick/
  //  const WINDOWS_WATCHER_HINT = /\\watcher\\win32\\CodeHelper\.exe/
  //  const WINDOWS_CRASH_REPORTER = /--crashes-directory/
  //  const WINDOWS_PTY = /\\pipe\\winpty-control/
  //  const WINDOWS_CONSOLE_HOST = /conhost\.exe/
  //  const TYPE = /--type=([a-zA-Z-]+)/

  //  // find windows file watcher
  //  if (WINDOWS_WATCHER_HINT.exec(cmd)) return 'watcherService '

  //  // find windows crash reporter
  //  if (WINDOWS_CRASH_REPORTER.exec(cmd)) return 'electron-crash-reporter'

  //  // find windows pty process
  //  if (WINDOWS_PTY.exec(cmd)) return 'winpty-process'

  //  //find windows console host process
  //  if (WINDOWS_CONSOLE_HOST.exec(cmd)) return 'console-window-host (Windows internal process)'

  //  // find "--type=xxxx"
  //  let matches = TYPE.exec(cmd)
  //  if (matches && matches.length === 2) {
  //    if (matches[1] === 'renderer') {
  //      if (SHARED_PROCESS_HINT.exec(cmd)) {
  //        return 'shared-process'
  //      }

  //      return `window`
  //    }
  //    return matches[1]
  //  }

  //  // find all xxxx.js
  //  const JS = /[a-zA-Z-]+\.js/g
  //  let result = ''
  //  do {
  //    matches = JS.exec(cmd)
  //    if (matches) {
  //      result += matches + ' '
  //    }
  //  } while (matches)

  //  if (result) {
  //    if (cmd.indexOf('node ') !== 0) {
  //      return `electron_node ${result}`
  //    }
  //  }
  //  return cmd
  //}

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

        console.log('stats', stats)
        addToTree(stats)
      })

    done(rootItem)
  })
})

setInterval(async () => {
  const procs = await listProcesses(remote.process.pid)
  content.innerText = JSON.stringify(procs, null, 2)
}, 2e3)
