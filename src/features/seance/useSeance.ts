import { subDays } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import type { Grave } from '../../domain/trial'
import { demoInbox, scanEmails, type Candidate, type EmailProvider, type ScanProgress } from '../../lib/email'

type Phase = 'idle' | 'consent' | 'scanning' | 'review' | 'error'
const emptyProgress = { read: 0, found: 0 }

export function scanMessage({ read, found }: ScanProgress) {
  return `The spirits have read ${read} ${read === 1 ? 'letter' : 'letters'} and found ${found} restless ${found === 1 ? 'trial' : 'trials'}.`
}

export function foundMessage(count: number) {
  return `${count} ${count === 1 ? 'spirit' : 'spirits'} found`
}

export function useSeance(now: Date, graves: Grave[], makeProvider = demoInbox) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(emptyProgress)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const provider = useRef<EmailProvider>()
  const generation = useRef(0)

  useEffect(() => () => { generation.current++; void provider.current?.disconnect() }, [])

  function disconnect() {
    generation.current++
    void provider.current?.disconnect()
    provider.current = undefined
    setCandidates([])
    setProgress(emptyProgress)
    setPhase('idle')
  }

  async function scan() {
    const session = ++generation.current
    let inbox: EmailProvider | undefined
    try {
      inbox = makeProvider(now, true)
      provider.current = inbox
      setPhase('scanning')
      await inbox.connect()
      if (session !== generation.current) { await inbox.disconnect(); return }
      const found = await scanEmails(inbox.searchReceipts({ since: subDays(now, 30) }), graves, now, (next, partial) => {
        if (session !== generation.current) return
        setProgress(next)
        setCandidates(partial)
      })
      if (session === generation.current) { setCandidates(found); setPhase('review') }
    } catch {
      if (session === generation.current) setPhase('error')
    }
  }

  return { phase, progress, candidates, ask: () => setPhase('consent'), scan, disconnect }
}
