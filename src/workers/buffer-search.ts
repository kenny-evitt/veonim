import WorkerClient from '../messaging/worker-client'
import { filter as fuzzy, match } from 'fuzzaldrin-plus'
import { join } from 'path'

interface FilterResult {
  line: string,
  start: {
    line: number,
    column: number,
  },
  end: {
    line: number,
    column: number,
  }
}

const { on } = WorkerClient()
const buffers = new Map<string, string[]>()

const getLocations = (str: string, query: string, buffer: string[]) => {
  const line = buffer.indexOf(str)
  const locations = match(str, query)

  return {
    start: { line, column: locations[0] },
    end: { line, column: locations[locations.length - 1] },
  }
}

const filter = (cwd: string, file: string, query: string, maxResults = 20): FilterResult[] => {
  const bufferData = buffers.get(join(cwd, file)) || []
  const results = fuzzy(bufferData, query, { maxResults })

  return [...new Set(results)]
    .map(m => ({
      line: m,
      ...getLocations(m, query, bufferData),
    }))
}

// TODO: allow query over a range of lines this would be useful to first search
// over only the lines visible in the current vim window. if not found, only
// then search entire buffer.

on.set((cwd: string, file: string, buffer: string[]) => buffers.set(join(cwd, file), buffer))

on.query(async (cwd: string, file: string, query: string, max?: number) =>
  filter(cwd, file, query, max))

