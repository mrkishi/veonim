import { on, onCreateVim, onSwitchVim } from '../messaging/worker-client'
import TextDocumentManager from '../neovim/text-document-manager'
import SessionTransport from '../messaging/session-transport'
import { filter as fuzzy } from 'fuzzaldrin-plus'
import SetupRPC from '../messaging/rpc'
import Neovim from '../neovim/api'

const { send, connectTo, switchTo, onRecvData } = SessionTransport()
const { onData, ...rpcAPI } = SetupRPC(send)

onRecvData(([ type, d ]) => onData(type, d))
onCreateVim(connectTo)
onSwitchVim(switchTo)

const nvim = Neovim({ ...rpcAPI, onCreateVim, onSwitchVim })
const tdm = TextDocumentManager(nvim)

const keywords = (() => {
  const m = new Map<string, string[]>()

  return {
    set: (file: string, words: string[]) => m.set(file, words),
    get: (file: string) => m.get(file),
    add: (file: string, word: string) => {
      const e = m.get(file) || []
      if (e.includes(word)) return
      m.set(file, (e.push(word), e))
    }
  }
})()

const harvest = (buffer: string[]) => {
  const keywords = new Set<string>()
  const totalol = buffer.length

  for (let ix = 0; ix < totalol; ix++) {
    const words = buffer[ix].match(/[A-Za-z]\w+/g) || []
    const wordsTotal = words.length

    for (let wix = 0; wix < wordsTotal; wix++) {
      const word = words[wix]
      if (word.length > 2) keywords.add(word)
    }
  }

  return [...keywords]
}

const harvestKeywords = (file: string, buffer: string[]): void => {
  const words = harvest(buffer)
  keywords.set(file, words)
}

const filter = (file: string, query: string, maxResults = 20): string[] =>
  fuzzy(keywords.get(file) || [], query, { maxResults })

on.query(async (file: string, query: string, max?: number) => await filter(file, query, max))
on.add((file: string, word: string) => keywords.add(file, word))

tdm.on.didOpen(({ name, textLines }) => harvestKeywords(name, textLines))
tdm.on.didChange(({ name, textChanges }) => harvestKeywords(name, textChanges.textLines))
