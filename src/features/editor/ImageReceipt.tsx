import { useEffect, useRef, useState, type RefObject } from 'react'
import { defaultEngine, parseText, preprocessImage, readImageReceipt, type OcrEngine } from '../../lib/ocr'
import type { ParseResult } from '../../lib/parse'
import styles from './editor.module.css'

type Reading = ReturnType<typeof parseText>
type Source = Blob | ((signal: AbortSignal) => Promise<Blob>)
const confidenceText = {
  clear: 'The spirits read this image clearly.',
  partial: 'The spirits could read parts of this image. Check the fields.',
  poor: 'The spirits had trouble reading this image.',
}

export function ImageReceipt({ now, onParsed, onManual, clipboardTarget, engine = defaultEngine, preprocess = preprocessImage }: {
  now: Date; onParsed: (parsed: ParseResult) => void; onManual: () => void;
  clipboardTarget?: RefObject<HTMLTextAreaElement>; engine?: OcrEngine; preprocess?: typeof preprocessImage;
}) {
  const controller = useRef<AbortController>()
  const [image, setImage] = useState<Blob>()
  const [preview, setPreview] = useState('')
  const [reading, setReading] = useState<Reading>()
  const [progress, setProgress] = useState<number>()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => () => { controller.current?.abort() }, [])
  useEffect(() => {
    if (!image) { setPreview(''); return }
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  function clear() {
    controller.current?.abort()
    setImage(undefined)
    setReading(undefined)
    setProgress(undefined)
    setError(false)
    setNotice('')
  }

  async function read(source: Source) {
    clear()
    const session = new AbortController()
    controller.current = session
    const { signal } = session
    setProgress(0)
    try {
      const file = source instanceof Blob ? source : await source(signal)
      signal.throwIfAborted()
      if (!file.type.startsWith('image/')) {
        setError(true)
        setNotice('That file is not an image. Try a screenshot or photo.')
        return
      }
      setImage(file)
      const canvas = await preprocess(file, signal)
      signal.throwIfAborted()
      const result = await readImageReceipt(engine, canvas, now, {
        signal, onProgress: value => { if (!signal.aborted) setProgress(Math.min(100, Math.max(0, value))) },
      })
      setReading(result)
      if (Object.keys(result.parsed).length) onParsed(result.parsed)
    } catch {
      if (!signal.aborted) {
        setError(true)
        setNotice('The spirits could not open this image. Try another image or enter the trial by hand.')
      }
    } finally {
      if (!signal.aborted) setProgress(undefined)
    }
  }

  function paste(event: ClipboardEvent | React.ClipboardEvent) {
    const clipboard = event.clipboardData
    if (!clipboard) return
    const file = Array.from(clipboard.files).find(item => item.type.startsWith('image/'))
      ?? Array.from(clipboard.items).find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
    if (file) { event.preventDefault(); void read(file) }
  }

  useEffect(() => {
    const input = clipboardTarget?.current
    input?.addEventListener('paste', paste)
    return () => input?.removeEventListener('paste', paste)
  })

  function readAgain() {
    if (!reading) return
    const result = parseText(reading.text, now, reading.confidence)
    setReading(result)
    if (Object.keys(result.parsed).length) onParsed(result.parsed)
    setNotice(Object.keys(result.parsed).length ? 'Edited text read. Review the fields before saving.' : '')
  }

  function sample() {
    void read(async signal => {
      const response = await fetch(`${import.meta.env.BASE_URL}samples/phantomflix.png`, { signal })
      if (!response.ok) throw new Error('Sample unavailable')
      return response.blob()
    })
  }

  return <section className={styles.imageReader} aria-label="Image receipt"
    onDragOver={event => event.preventDefault()} onDrop={event => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file) void read(file)
    }} onPaste={paste}>
    <div className="actions">
      <label className={`button ${styles.upload}`}>Choose an image
        <input type="file" accept="image/*" aria-label="Choose an image" onChange={event => {
          const file = event.currentTarget.files?.[0]
          if (file) void read(file)
          event.currentTarget.value = ''
        }} /></label>
      <label className={`button ${styles.upload}`}>Use camera
        <input type="file" accept="image/*" capture="environment" aria-label="Use camera" onChange={event => {
          const file = event.currentTarget.files?.[0]
          if (file) void read(file)
          event.currentTarget.value = ''
        }} /></label>
      <button type="button" onClick={sample}>Try a sample screenshot</button>
    </div>
    <p className="muted">Drop or paste an image here. Images and extracted text stay in this browser. Only the confirmed trial is saved. The reader downloads its tools from this site on first use.</p>
    {preview && <div className="stack"><img className={styles.preview} src={preview} alt="Selected receipt preview" />
      <div><button type="button" onClick={clear}>Remove image</button></div></div>}
    {progress !== undefined && <div className="stack">
      <p role="status">The spirits are deciphering…</p>
      <progress className={styles.progress} aria-label="Reading image" value={progress} max={100} />
      <div><button type="button" onClick={() => {
        controller.current?.abort()
        setProgress(undefined)
        setNotice('The spirits were sent back to rest.')
      }}>Cancel reading</button></div>
    </div>}
    {reading && <div className="stack">
      <p role="status">{reading.problem === 'no-text' ? 'The spirits found no text in this image.'
        : reading.problem === 'no-fields' ? 'The spirits found text but no trial fields.' : confidenceText[reading.hint]}</p>
      {reading.text && <details><summary>What the spirits read</summary>
        <label className="stack">OCR text<textarea value={reading.text}
          onChange={event => setReading({ ...reading, text: event.target.value })} maxLength={50_000} /></label>
        <button type="button" onClick={readAgain}>Read again</button>
      </details>}
    </div>}
    {notice && <p role={error ? 'alert' : 'status'}>{notice}</p>}
    {(error || reading?.problem) && <div><button type="button" onClick={onManual}>Enter it by hand</button></div>}
  </section>
}
