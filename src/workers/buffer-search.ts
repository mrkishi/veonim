import WorkerClient from '../messaging/worker-client'
import { filter as fuzzy } from 'fuzzaldrin-plus'
import { join } from 'path'

const { on } = WorkerClient()

const buffers = new Map<string, string[]>()

const filter = (cwd: string, file: string, query: string, maxResults = 20): string[] =>
  fuzzy(buffers.get(join(cwd, file)) || [], query, { maxResults })

on.set((cwd: string, file: string, buffer: string[]) => buffers.set(join(cwd, file), buffer))

on.query(async (cwd: string, file: string, query: string, max?: number) =>
  filter(cwd, file, query, max))

