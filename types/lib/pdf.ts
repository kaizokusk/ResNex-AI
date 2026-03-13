// lib/pdf.ts — PDF export logic using jsPDF + html2canvas (client-side)
// Import this only in browser context (never in API routes)

/**
 * Export the element with the given ID as a PDF download.
 * Uses html2canvas to capture the DOM, then jsPDF to generate the PDF.
 */
export async function exportElementAsPdf(
  elementId: string,
  filename = 'document.pdf'
): Promise<void> {
  // Dynamic imports — these are large browser-only bundles
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const element = document.getElementById(elementId)
  if (!element) throw new Error(`Element #${elementId} not found`)

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width / 2, canvas.height / 2],
  })

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
  pdf.save(filename)
}

/**
 * Export raw HTML content as a PDF.
 * Renders the HTML in an off-screen div, then captures it.
 */
export async function exportHtmlAsPdf(
  htmlContent: string,
  filename = 'document.pdf'
): Promise<void> {
  const container = document.createElement('div')
  container.innerHTML = htmlContent
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:white;padding:40px;'
  document.body.appendChild(container)

  try {
    await exportElementAsPdf(container.id, filename)
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * Export a .tex file as a download.
 */
export function exportTexFile(latexContent: string, filename = 'paper.tex'): void {
  const blob = new Blob([latexContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
