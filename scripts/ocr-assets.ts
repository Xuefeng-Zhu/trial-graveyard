import { createReadStream, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

const resolve = createRequire(import.meta.url).resolve
const worker = resolve('tesseract.js/dist/worker.min.js')
const core = dirname(resolve('tesseract.js-core'))
const paths = {
  'worker.min.js': worker,
  'worker.min.js.LICENSE.txt': `${worker}.LICENSE.txt`,
  'tesseract.js.LICENSE.md': join(dirname(worker), '..', 'LICENSE.md'),
  'tesseract.js-core.LICENSE.txt': join(core, 'LICENSE'),
  'tesseract-core-lstm.wasm.js': join(core, 'tesseract-core-lstm.wasm.js'),
  'eng.traineddata.gz': join(dirname(resolve('@tesseract.js-data/eng')), '4.0.0_best_int/eng.traineddata.gz'),
}

export function ocrAssets(): Plugin {
  return {
    name: 'trial-graveyard-ocr-assets',
    configureServer(server) {
      const prefix = `${server.config.base}ocr/`
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith(prefix)) { next(); return }
        const file = request.url.slice(prefix.length).split('?')[0]
        if (!Object.hasOwn(paths, file)) { next(); return }
        response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.gz') ? 'application/gzip' : 'text/plain')
        createReadStream(paths[file as keyof typeof paths]).pipe(response)
      })
    },
    generateBundle() {
      for (const [name, source] of Object.entries(paths)) {
        this.emitFile({ type: 'asset', fileName: `ocr/${name}`, source: readFileSync(source) })
      }
    },
  }
}
