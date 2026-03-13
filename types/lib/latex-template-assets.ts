type VirtualCompileAssetResult = {
  mainTex: string
  files: Array<{ fileName: string; content: string }>
}

const MINIMAL_NEURIPS_STYLE = String.raw`\NeedsTeXFormat{LaTeX2e}
\ProvidesPackage{neurips_2024}[2024/01/01 Minimal fallback style for ResearchCollab]
\RequirePackage{natbib}
\RequirePackage{geometry}
\geometry{margin=1in}
\newif\if@neuripspreprint
\@neuripspreprintfalse
\DeclareOption{preprint}{\@neuripspreprinttrue}
\DeclareOption*{}
\ProcessOptions\relax
\endinput
`

export function getVirtualCompileAssets(templateId: string | null | undefined, mainTex: string): VirtualCompileAssetResult {
  if (templateId === 'neurips') {
    return {
      mainTex: mainTex
        .replace(/\\usepackage(?:\[[^\]]*\])?\{neurips_2024\}\s*/g, '')
        .replace(/\\bibliographystyle\{neurips_2024\}/g, '\\bibliographystyle{plain}'),
      files: [
        {
          fileName: 'neurips_2024.sty',
          content: MINIMAL_NEURIPS_STYLE,
        },
      ],
    }
  }

  return { mainTex, files: [] }
}
