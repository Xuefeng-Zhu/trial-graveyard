export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function downloadIcs(content: string, name: string) {
  downloadFile(new Blob([content], { type: 'text/calendar;charset=utf-8' }), `${name}.ics`)
}
