#!/usr/bin/env node
// latex-server.js — Local pdflatex HTTP server
// Accepts multipart/form-data POST /compile.
// Files can be sent with field name "file:PATH" (e.g. "file:figures/image.png")
// to preserve subdirectory paths — this is needed because fetch/FormData strips
// slashes from the filename parameter in Content-Disposition headers.
// Falls back to "files[]" with filename for compatibility.
// Returns JSON { success, pdf (base64), log }
// Usage: node latex-server.js [port]

const http    = require('http')
const busboy  = require('busboy')
const fs      = require('fs')
const path    = require('path')
const os      = require('os')
const { execSync } = require('child_process')

const PORT = parseInt(process.argv[2] || '2345', 10)

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(body)
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return sendJSON(res, 200, { status: 'ok', pdflatex: true })
  }
  if (req.method !== 'POST' || !req.url.startsWith('/compile')) {
    return sendJSON(res, 404, { error: 'Not found' })
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-'))
  const pending = []

  let bb
  try {
    bb = busboy({ headers: req.headers })
  } catch (e) {
    cleanup(tmpDir)
    return sendJSON(res, 400, { success: false, log: 'Invalid multipart: ' + e.message })
  }

  bb.on('file', (fieldname, stream, info) => {
    // If field name is "file:PATH", use that path directly — preserves subdirectories.
    // Otherwise fall back to the (potentially stripped) filename from Content-Disposition.
    const fullPath = fieldname.startsWith('file:')
      ? fieldname.slice(5)
      : (info.filename || 'file')

    const dest = path.join(tmpDir, fullPath)
    fs.mkdirSync(path.dirname(dest), { recursive: true })

    const chunks = []
    stream.on('data', c => chunks.push(c))
    pending.push(new Promise((resolve, reject) => {
      stream.on('end', () => {
        try { fs.writeFileSync(dest, Buffer.concat(chunks)); resolve() }
        catch (e) { reject(e) }
      })
      stream.on('error', reject)
    }))
  })

  bb.on('close', async () => {
    try {
      await Promise.all(pending)

      // Find main .tex file
      const allFiles = walkDir(tmpDir)
      const texFiles = allFiles.map(f => path.relative(tmpDir, f)).filter(f => f.endsWith('.tex'))
      const mainTex  = texFiles.includes('main.tex') ? 'main.tex' : texFiles[0]

      if (!mainTex) {
        cleanup(tmpDir)
        return sendJSON(res, 200, { success: false, log: 'No .tex file received.' })
      }

      // Run pdflatex twice (resolves cross-references)
      let log = ''
      for (let pass = 1; pass <= 2; pass++) {
        try {
          log = execSync(
            `pdflatex -interaction=nonstopmode -halt-on-error "${mainTex}"`,
            { cwd: tmpDir, timeout: 60000, encoding: 'utf8' }
          )
        } catch (e) {
          log = e.stdout || e.message || 'pdflatex error'
          const pdfPath = path.join(tmpDir, mainTex.replace(/\.tex$/, '.pdf'))
          if (!fs.existsSync(pdfPath)) {
            cleanup(tmpDir)
            return sendJSON(res, 200, { success: false, log })
          }
        }
      }

      const pdfPath = path.join(tmpDir, mainTex.replace(/\.tex$/, '.pdf'))
      if (!fs.existsSync(pdfPath)) {
        cleanup(tmpDir)
        return sendJSON(res, 200, { success: false, log: log || 'PDF not produced.' })
      }

      const pdf = fs.readFileSync(pdfPath).toString('base64')
      cleanup(tmpDir)
      sendJSON(res, 200, { success: true, pdf, log })
    } catch (err) {
      cleanup(tmpDir)
      sendJSON(res, 200, { success: false, log: err.message || String(err) })
    }
  })

  bb.on('error', err => {
    cleanup(tmpDir)
    sendJSON(res, 200, { success: false, log: 'Parse error: ' + err.message })
  })

  req.pipe(bb)
})

function walkDir(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walkDir(full))
    else results.push(full)
  }
  return results
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
}

server.listen(PORT, () => {
  console.log(`LaTeX server running at http://localhost:${PORT}`)
  console.log(`Set LATEX_COMPILER_URL=http://localhost:${PORT} in your .env`)
})
