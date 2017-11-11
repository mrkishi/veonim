import { connect, Server } from '@veonim/jsonrpc'
import { spawn } from 'child_process'

/*
 * look for servers in ~/.config/veonim/langserv or ~/AppData/Local/veonim/langserv
 * each language server placed in its own folder
 * right now assume manual user installation (user needs to download to folder and run npm install or w/e/etc)
 *
 * each server is a npm package module
 *
 * package.json has fields to activate for languages
 *   "activationEvents": [
        "onLanguage:markdown"
    ],

    server start is defined as npm script "start" (only really makes sense for TCP)
    for IPC we need process reference...

    this means we need to run extension activation modules in-proccess........s.ssss..
    maybe ok, but kinda risky (ifnot authored by me). should follow vscode model of running
    extensions out of process. not really a big deal right now since the only thing an extensions
    can/should do is start the lang server

    what's the risk? blocking the UI?

    i think it's a little tricky to run another out-of-band process with electron (need to use
    electron node runtime)

    maybe simplest would be a separate web worker to start lang servers and manage them?
    then it doesn't block the UI. idk about other issues...

    ok so then the webworker thread will require the lang serv npm packages

    modules should export { activate, deactivate } functions

    functions should be async
    activate function should return process reference on completion

    if fail, try up to 5 times immediatly restart before giving up

    if normal running but crash, try restart up to 5 times

    alert user if lang server crash

    show status in statusbar if server has started and is running ok




    -- FUTURE
    langserv modules published on github
    list of modules (json) served on github.io in veonim org + repo
    vimrc defines list of language servers to support (not langs because erver can have multi lang)
    veonim read vimrc, get list, download lang serv module from github to .config/veonim/langserv
    !!!!!! veonim run npm install (how does this work if npm is not installed on machine?)
    then do the usual require module and run .activate()




    (derp)
    (derp)
    (((((((((((((((((((())))))))))))))))))))
    ((((((((((9))))))))))
    [[[[[[[[[[[[[]]]]]]]]]]]]]
    [[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]
    ||||||||||||||||||||
    ((((((((((((((()))))))))))))))
    [[]]
    [[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]

    ((((((((((((((((()))))))))))))))))

    veonim will attempt to start 
 */

const servers = new Map<string, () => Promise<Server>>()

servers.set('typescript', async () => {
  const proc = spawn('node', [
    'node_modules/javascript-typescript-langserver/lib/language-server-stdio.js',
    '--trace',
  ])

  //proc.on('error', e => console.error('err in ts server', e))

  //proc.stdout.on('data', b => {
    //console.log('>>', b+'')
  //})

  // debug info printed here
  //proc.stderr.on('data', b => {
    //console.log('!!',b+'')
  //})

  return connect.ipc(proc)
})

servers.set('javascript', async () => {
  const proc = spawn('node', [
    'node_modules/javascript-typescript-langserver/lib/language-server-stdio.js',
    '--trace',
  ])

  return connect.ipc(proc)
})

export const hasServerFor = (language: string) => servers.has(language)
export const startServerFor = (language: string) => servers.get(language)!()
