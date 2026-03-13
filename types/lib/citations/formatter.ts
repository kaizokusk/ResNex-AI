import { callDeepseekV3 } from '@/lib/llm/deepseek'

export type CitationStyle = 'ieee' | 'apa' | 'acs' | 'mla'

export async function reformatCitations(bibliographyLatex: string, style: CitationStyle): Promise<string> {
  const styleGuides: Record<CitationStyle, string> = {
    ieee: 'IEEE format: [1] A. Author, "Title," Journal, vol. X, pp. Y, Year.',
    apa: 'APA format: Author, A. (Year). Title. Journal, Vol(Issue), pages.',
    acs: 'ACS format: Author, A. B. Journal Abbrev. Year, Vol, pages.',
    mla: 'MLA format: Last, First. "Title." Journal vol.issue (Year): pages.'
  }
  const prompt = `Reformat this BibTeX bibliography section into ${style.toUpperCase()} citation style.
Style guide: ${styleGuides[style]}
Return ONLY the reformatted bibliography LaTeX. No explanation.

Bibliography:
${bibliographyLatex}`

  return callDeepseekV3(prompt)
}
