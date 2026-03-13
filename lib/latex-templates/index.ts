// lib/latex-templates/index.ts
// Registry of all supported LaTeX paper templates
// Sections use %%SECTION:name%% placeholders replaced at conversion time

export interface TemplateSection {
  name: string        // machine name, used as filename: sections/{name}.json
  label: string       // display name
  description: string // hint shown in AI writing assistant
  wordTarget: number  // suggested word count
}

export interface LatexTemplate {
  id: string
  label: string
  description: string
  category: 'conference' | 'ai-conference' | 'journal' | 'thesis' | 'other'
  sections: TemplateSection[]
  bibStyle: string
  mainTexSkeleton: string // full LaTeX with %%SECTION:name%% placeholders
}

// ─── Helper ────────────────────────────────────────────────────────────────

function sectionPlaceholder(name: string) {
  return `%%SECTION:${name}%%`
}

// ─── Templates ─────────────────────────────────────────────────────────────

const IEEE: LatexTemplate = {
  id: 'ieee',
  label: 'IEEE Conference Paper',
  description: 'Standard IEEE two-column conference format (IEEEtran)',
  category: 'conference',
  bibStyle: 'IEEEtran',
  sections: [
    { name: 'abstract',      label: 'Abstract',      description: 'Brief summary of problem, approach, and key results', wordTarget: 150 },
    { name: 'introduction',  label: 'Introduction',  description: 'Background, motivation, problem statement, contributions', wordTarget: 400 },
    { name: 'related-work',  label: 'Related Work',  description: 'Survey of relevant prior work and how this paper differs', wordTarget: 350 },
    { name: 'methodology',   label: 'Methodology',   description: 'Technical approach, model design, algorithms', wordTarget: 500 },
    { name: 'experiments',   label: 'Experiments',   description: 'Dataset, experimental setup, baselines, metrics', wordTarget: 300 },
    { name: 'results',       label: 'Results',       description: 'Quantitative and qualitative results with tables/figures', wordTarget: 400 },
    { name: 'discussion',    label: 'Discussion',    description: 'Analysis, limitations, ablations', wordTarget: 250 },
    { name: 'conclusion',    label: 'Conclusion',    description: 'Summary of contributions and future work', wordTarget: 150 },
  ],
  mainTexSkeleton: `\\documentclass[conference]{IEEEtran}
\\IEEEoverridecommandlockouts
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{textcomp}
\\usepackage{xcolor}
\\usepackage{booktabs}

\\begin{document}

\\title{%%TITLE%%}

\\author{\\IEEEauthorblockN{Author Name}
\\IEEEauthorblockA{\\textit{Institution}\\\\City, Country\\\\email@example.com}}

\\maketitle

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\begin{IEEEkeywords}
keyword1, keyword2, keyword3
\\end{IEEEkeywords}

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Related Work}
${sectionPlaceholder('related-work')}

\\section{Methodology}
${sectionPlaceholder('methodology')}

\\section{Experiments}
${sectionPlaceholder('experiments')}

\\section{Results}
${sectionPlaceholder('results')}

\\section{Discussion}
${sectionPlaceholder('discussion')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\bibliographystyle{IEEEtran}
\\bibliography{refs}

\\end{document}`,
}

const ACM: LatexTemplate = {
  id: 'acm',
  label: 'ACM Paper',
  description: 'ACM SIG proceedings format',
  category: 'conference',
  bibStyle: 'ACM-Reference-Format',
  sections: [
    { name: 'abstract',      label: 'Abstract',      description: 'Problem, method, results, and significance', wordTarget: 150 },
    { name: 'introduction',  label: 'Introduction',  description: 'Context, problem, motivation, and paper structure', wordTarget: 400 },
    { name: 'background',    label: 'Background',    description: 'Necessary background knowledge and related work', wordTarget: 350 },
    { name: 'methodology',   label: 'Methodology',   description: 'System design, algorithms, technical approach', wordTarget: 500 },
    { name: 'evaluation',    label: 'Evaluation',    description: 'Setup, metrics, datasets, comparison methods', wordTarget: 350 },
    { name: 'discussion',    label: 'Discussion',    description: 'Insights, limitations, threats to validity', wordTarget: 250 },
    { name: 'conclusion',    label: 'Conclusion',    description: 'Summary and future directions', wordTarget: 150 },
    { name: 'future-work',   label: 'Future Work',   description: 'Open problems and planned extensions', wordTarget: 100 },
  ],
  mainTexSkeleton: `\\documentclass[sigconf]{acmart}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{booktabs}
\\usepackage{amsmath}

\\begin{document}

\\title{%%TITLE%%}

\\author{Author Name}
\\affiliation{\\institution{Institution}\\city{City}\\country{Country}}
\\email{email@example.com}

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\keywords{keyword1, keyword2, keyword3}

\\maketitle

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Background}
${sectionPlaceholder('background')}

\\section{Methodology}
${sectionPlaceholder('methodology')}

\\section{Evaluation}
${sectionPlaceholder('evaluation')}

\\section{Discussion}
${sectionPlaceholder('discussion')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\section{Future Work}
${sectionPlaceholder('future-work')}

\\bibliographystyle{ACM-Reference-Format}
\\bibliography{refs}

\\end{document}`,
}

const NEURIPS: LatexTemplate = {
  id: 'neurips',
  label: 'NeurIPS',
  description: 'Neural Information Processing Systems — ML/AI flagship conference',
  category: 'ai-conference',
  bibStyle: 'neurips_2024',
  sections: [
    { name: 'abstract',        label: 'Abstract',        description: 'Concise summary: problem, approach, key results (max 300 words)', wordTarget: 250 },
    { name: 'introduction',    label: 'Introduction',    description: 'Motivation, problem statement, contributions, paper organisation', wordTarget: 500 },
    { name: 'related-work',    label: 'Related Work',    description: 'Prior work in ML/AI, what gap this paper fills', wordTarget: 400 },
    { name: 'background',      label: 'Background',      description: 'Mathematical preliminaries, problem formulation, notation', wordTarget: 300 },
    { name: 'method',          label: 'Method',          description: 'Proposed approach, model architecture, training objective', wordTarget: 600 },
    { name: 'experiments',     label: 'Experiments',     description: 'Datasets, baselines, evaluation protocol, implementation details', wordTarget: 400 },
    { name: 'results',         label: 'Results',         description: 'Main results table, ablation studies, qualitative examples', wordTarget: 400 },
    { name: 'conclusion',      label: 'Conclusion',      description: 'Summary of contributions, limitations, future directions', wordTarget: 200 },
    { name: 'broader-impact',  label: 'Broader Impact',  description: 'Societal impact, ethical considerations, potential misuse', wordTarget: 200 },
  ],
  mainTexSkeleton: `\\documentclass{article}
\\usepackage[preprint]{neurips_2024}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{booktabs}
\\usepackage{microtype}
\\usepackage{hyperref}
\\usepackage{url}

\\title{%%TITLE%%}

\\author{%
  Author Name \\\\
  Institution \\\\
  \\texttt{email@example.com}
}

\\begin{document}

\\maketitle

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Related Work}
${sectionPlaceholder('related-work')}

\\section{Background}
${sectionPlaceholder('background')}

\\section{Method}
${sectionPlaceholder('method')}

\\section{Experiments}
${sectionPlaceholder('experiments')}

\\section{Results}
${sectionPlaceholder('results')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\section*{Broader Impact}
${sectionPlaceholder('broader-impact')}

\\bibliographystyle{neurips_2024}
\\bibliography{refs}

\\end{document}`,
}

const ICML: LatexTemplate = {
  id: 'icml',
  label: 'ICML',
  description: 'International Conference on Machine Learning',
  category: 'ai-conference',
  bibStyle: 'icml2024',
  sections: [
    { name: 'abstract',      label: 'Abstract',      description: 'Problem, method, key contributions (max 200 words)', wordTarget: 180 },
    { name: 'introduction',  label: 'Introduction',  description: 'Motivation, gap in literature, paper contributions', wordTarget: 500 },
    { name: 'related-work',  label: 'Related Work',  description: 'Relevant ML literature and positioning of this work', wordTarget: 400 },
    { name: 'approach',      label: 'Approach',      description: 'Proposed method, theoretical analysis, algorithms', wordTarget: 700 },
    { name: 'experiments',   label: 'Experiments',   description: 'Setup, datasets, baselines, hyperparameter details', wordTarget: 400 },
    { name: 'discussion',    label: 'Discussion',    description: 'Ablations, failure modes, interpretability', wordTarget: 300 },
    { name: 'conclusion',    label: 'Conclusion',    description: 'Summary, limitations, future work', wordTarget: 150 },
  ],
  mainTexSkeleton: `\\documentclass{article}
\\usepackage[accepted]{icml2024}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{booktabs}
\\usepackage{microtype}
\\usepackage{hyperref}

\\icmltitlerunning{%%TITLE%%}

\\begin{document}

\\twocolumn[
\\icmltitle{%%TITLE%%}

\\icmlsetsymbol{equal}{*}

\\begin{icmlauthorlist}
\\icmlauthor{Author Name}{inst}
\\end{icmlauthorlist}

\\icmlaffiliation{inst}{Institution, City, Country}
\\icmlcorrespondingauthor{Author Name}{email@example.com}

\\vskip 0.3in
]

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Related Work}
${sectionPlaceholder('related-work')}

\\section{Approach}
${sectionPlaceholder('approach')}

\\section{Experiments}
${sectionPlaceholder('experiments')}

\\section{Discussion}
${sectionPlaceholder('discussion')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\bibliography{refs}
\\bibliographystyle{icml2024}

\\end{document}`,
}

const ICLR: LatexTemplate = {
  id: 'iclr',
  label: 'ICLR',
  description: 'International Conference on Learning Representations',
  category: 'ai-conference',
  bibStyle: 'iclr2025',
  sections: [
    { name: 'abstract',            label: 'Abstract',            description: 'Core claims, method summary, and results', wordTarget: 200 },
    { name: 'introduction',        label: 'Introduction',        description: 'Motivation, key hypothesis, contributions', wordTarget: 500 },
    { name: 'related-work',        label: 'Related Work',        description: 'Prior representation learning work, comparison', wordTarget: 400 },
    { name: 'method',              label: 'Method',              description: 'Architecture, training procedure, theoretical motivation', wordTarget: 600 },
    { name: 'experimental-setup',  label: 'Experimental Setup',  description: 'Datasets, baselines, metrics, implementation', wordTarget: 300 },
    { name: 'results',             label: 'Results',             description: 'Main tables, ablations, visualisations', wordTarget: 450 },
    { name: 'conclusion',          label: 'Conclusion',          description: 'Summary, limitations, open problems', wordTarget: 150 },
    { name: 'reproducibility',     label: 'Reproducibility',     description: 'Code, compute, hyperparameters, seeds', wordTarget: 100 },
  ],
  mainTexSkeleton: `\\documentclass{article}
\\usepackage{iclr2025_conference,times}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{booktabs}
\\usepackage{microtype}
\\usepackage{hyperref}

\\title{%%TITLE%%}

\\author{Author Name \\\\
Institution \\\\
\\texttt{email@example.com}}

\\newcommand{\\fix}{\\marginpar{FIX}}
\\newcommand{\\new}{\\marginpar{NEW}}

\\begin{document}

\\maketitle

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Related Work}
${sectionPlaceholder('related-work')}

\\section{Method}
${sectionPlaceholder('method')}

\\section{Experimental Setup}
${sectionPlaceholder('experimental-setup')}

\\section{Results}
${sectionPlaceholder('results')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\subsubsection*{Reproducibility Statement}
${sectionPlaceholder('reproducibility')}

\\bibliography{refs}
\\bibliographystyle{iclr2025_conference}

\\end{document}`,
}

const CVPR: LatexTemplate = {
  id: 'cvpr',
  label: 'CVPR / ICCV / ECCV',
  description: 'Computer vision conferences (CVPR, ICCV, ECCV)',
  category: 'ai-conference',
  bibStyle: 'ieee',
  sections: [
    { name: 'abstract',      label: 'Abstract',      description: 'Visual task, method, benchmark results (max 250 words)', wordTarget: 200 },
    { name: 'introduction',  label: 'Introduction',  description: 'Visual problem, challenges, proposed solution, contributions', wordTarget: 500 },
    { name: 'related-work',  label: 'Related Work',  description: 'CV literature: detection, segmentation, representation, etc.', wordTarget: 400 },
    { name: 'method',        label: 'Method',        description: 'Network architecture, loss functions, training strategy', wordTarget: 600 },
    { name: 'experiments',   label: 'Experiments',   description: 'Benchmark datasets, metrics (mAP, IoU, FID, etc.), baselines', wordTarget: 400 },
    { name: 'results',       label: 'Results',       description: 'Quantitative tables, qualitative visualisations, ablations', wordTarget: 450 },
    { name: 'discussion',    label: 'Discussion',    description: 'Failure cases, computational cost, limitations', wordTarget: 200 },
    { name: 'conclusion',    label: 'Conclusion',    description: 'Contributions summary and future directions', wordTarget: 150 },
  ],
  mainTexSkeleton: `\\documentclass[10pt,twocolumn,letterpaper]{article}
\\usepackage{cvpr}
\\usepackage{times}
\\usepackage{epsfig}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{booktabs}

\\cvprfinalcopy

\\begin{document}

\\title{%%TITLE%%}

\\author{Author Name\\\\
Institution\\\\
City, Country\\\\
{\\tt\\small email@example.com}}

\\maketitle

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Related Work}
${sectionPlaceholder('related-work')}

\\section{Method}
${sectionPlaceholder('method')}

\\section{Experiments}
${sectionPlaceholder('experiments')}

\\section{Results}
${sectionPlaceholder('results')}

\\section{Discussion}
${sectionPlaceholder('discussion')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

{\\small
\\bibliographystyle{ieee}
\\bibliography{refs}
}

\\end{document}`,
}

const ACL: LatexTemplate = {
  id: 'acl',
  label: 'ACL / EMNLP / NAACL',
  description: 'NLP conferences: ACL, EMNLP, NAACL, COLING',
  category: 'ai-conference',
  bibStyle: 'acl_natbib',
  sections: [
    { name: 'abstract',      label: 'Abstract',      description: 'NLP task, dataset, model, and key metrics', wordTarget: 180 },
    { name: 'introduction',  label: 'Introduction',  description: 'Language task motivation, challenges, contributions', wordTarget: 450 },
    { name: 'related-work',  label: 'Related Work',  description: 'NLP literature: transformers, prompting, fine-tuning, datasets', wordTarget: 400 },
    { name: 'methodology',   label: 'Methodology',   description: 'Model architecture, training, prompting strategy', wordTarget: 500 },
    { name: 'experiments',   label: 'Experiments',   description: 'Datasets, evaluation metrics, baselines, training details', wordTarget: 350 },
    { name: 'results',       label: 'Results',       description: 'Main results, ablations, error analysis', wordTarget: 400 },
    { name: 'analysis',      label: 'Analysis',      description: 'Qualitative examples, attention visualisation, case studies', wordTarget: 250 },
    { name: 'conclusion',    label: 'Conclusion',    description: 'Summary and future NLP directions', wordTarget: 150 },
    { name: 'limitations',   label: 'Limitations',   description: 'Scope restrictions, dataset bias, compute requirements', wordTarget: 100 },
    { name: 'ethics',        label: 'Ethics Statement', description: 'Data ethics, model misuse risks, fairness considerations', wordTarget: 100 },
  ],
  mainTexSkeleton: `\\documentclass[11pt]{article}
\\usepackage[hyperref]{acl2024}
\\usepackage{times}
\\usepackage{latexsym}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{booktabs}
\\usepackage{microtype}

\\title{%%TITLE%%}

\\author{Author Name \\\\
  Institution \\\\
  \\texttt{email@example.com}}

\\begin{document}
\\maketitle

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Related Work}
${sectionPlaceholder('related-work')}

\\section{Methodology}
${sectionPlaceholder('methodology')}

\\section{Experiments}
${sectionPlaceholder('experiments')}

\\section{Results}
${sectionPlaceholder('results')}

\\section{Analysis}
${sectionPlaceholder('analysis')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\section*{Limitations}
${sectionPlaceholder('limitations')}

\\section*{Ethics Statement}
${sectionPlaceholder('ethics')}

\\bibliography{refs}
\\bibliographystyle{acl_natbib}

\\end{document}`,
}

const AAAI: LatexTemplate = {
  id: 'aaai',
  label: 'AAAI',
  description: 'AAAI Conference on Artificial Intelligence',
  category: 'ai-conference',
  bibStyle: 'aaai25',
  sections: [
    { name: 'abstract',      label: 'Abstract',      description: 'AI problem, approach, and key result (max 150 words)', wordTarget: 130 },
    { name: 'introduction',  label: 'Introduction',  description: 'Problem, significance, approach, contributions', wordTarget: 450 },
    { name: 'related-work',  label: 'Related Work',  description: 'Relevant AI/ML/planning/reasoning literature', wordTarget: 350 },
    { name: 'approach',      label: 'Approach',      description: 'Algorithm, model, or system design with formalism', wordTarget: 600 },
    { name: 'experiments',   label: 'Experiments',   description: 'Setup, datasets, evaluation criteria, baselines', wordTarget: 350 },
    { name: 'results',       label: 'Results',       description: 'Performance comparison, ablation, discussion', wordTarget: 400 },
    { name: 'conclusion',    label: 'Conclusion',    description: 'Summary, limitations, future AI directions', wordTarget: 150 },
  ],
  mainTexSkeleton: `\\documentclass[letterpaper]{article}
\\usepackage{aaai25}
\\usepackage{times}
\\usepackage{helvet}
\\usepackage{courier}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{amsmath}
\\usepackage{booktabs}

\\setlength{\\pdfpagewidth}{8.5in}
\\setlength{\\pdfpageheight}{11in}

\\title{%%TITLE%%}
\\author{Author Name\\textsuperscript{\\rm 1}\\And
Another Author\\textsuperscript{\\rm 2}}
\\affiliations{
\\textsuperscript{\\rm 1}Institution One\\\\
\\textsuperscript{\\rm 2}Institution Two\\\\
email@example.com}

\\begin{document}
\\maketitle

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Related Work}
${sectionPlaceholder('related-work')}

\\section{Approach}
${sectionPlaceholder('approach')}

\\section{Experiments}
${sectionPlaceholder('experiments')}

\\section{Results}
${sectionPlaceholder('results')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\bibliography{refs}
\\end{document}`,
}

const KDD: LatexTemplate = {
  id: 'kdd',
  label: 'KDD / WWW / WSDM',
  description: 'Data mining & web conferences (KDD, WWW, WSDM, SIGIR)',
  category: 'ai-conference',
  bibStyle: 'ACM-Reference-Format',
  sections: [
    { name: 'abstract',      label: 'Abstract',      description: 'Data problem, scale, method, and real-world impact', wordTarget: 150 },
    { name: 'introduction',  label: 'Introduction',  description: 'Real-world data challenge, existing gap, contributions', wordTarget: 450 },
    { name: 'related-work',  label: 'Related Work',  description: 'Data mining, graph learning, recommender systems literature', wordTarget: 350 },
    { name: 'problem',       label: 'Problem Formulation', description: 'Formal problem definition, notation, objectives', wordTarget: 250 },
    { name: 'method',        label: 'Method',        description: 'Algorithm, model design, complexity analysis', wordTarget: 600 },
    { name: 'experiments',   label: 'Experiments',   description: 'Industrial datasets, offline/online evaluation, baselines', wordTarget: 400 },
    { name: 'results',       label: 'Results',       description: 'Performance tables, ablation, deployment results', wordTarget: 350 },
    { name: 'conclusion',    label: 'Conclusion',    description: 'Summary and impact on future data systems', wordTarget: 150 },
  ],
  mainTexSkeleton: `\\documentclass[sigconf]{acmart}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{booktabs}
\\usepackage{amsmath}

\\begin{document}

\\title{%%TITLE%%}

\\author{Author Name}
\\affiliation{\\institution{Institution}\\city{City}\\country{Country}}
\\email{email@example.com}

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\keywords{data mining, machine learning, keyword3}

\\maketitle

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Related Work}
${sectionPlaceholder('related-work')}

\\section{Problem Formulation}
${sectionPlaceholder('problem')}

\\section{Method}
${sectionPlaceholder('method')}

\\section{Experiments}
${sectionPlaceholder('experiments')}

\\section{Results}
${sectionPlaceholder('results')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\bibliographystyle{ACM-Reference-Format}
\\bibliography{refs}

\\end{document}`,
}

const NATURE: LatexTemplate = {
  id: 'nature',
  label: 'Nature / Science',
  description: 'High-impact journal format (Nature, Science, Cell)',
  category: 'journal',
  bibStyle: 'naturemag',
  sections: [
    { name: 'abstract',           label: 'Abstract',           description: 'Problem, findings, and significance (max 150 words, no citations)', wordTarget: 130 },
    { name: 'introduction',       label: 'Introduction',       description: 'Field background, open problem, what was found', wordTarget: 600 },
    { name: 'results',            label: 'Results',            description: 'Key findings without interpretation (data-driven)', wordTarget: 700 },
    { name: 'discussion',         label: 'Discussion',         description: 'Interpretation, comparison with literature, limitations', wordTarget: 500 },
    { name: 'methods',            label: 'Methods',            description: 'Experimental procedures, data collection, analysis', wordTarget: 600 },
    { name: 'data-availability',  label: 'Data Availability',  description: 'Where data can be accessed, accession numbers', wordTarget: 80 },
  ],
  mainTexSkeleton: `\\documentclass{article}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{amsmath}
\\usepackage{natbib}
\\usepackage{booktabs}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{%%TITLE%%}
\\author{Author Name\\textsuperscript{1} \\and Another Author\\textsuperscript{2}}
\\date{}

\\begin{document}
\\maketitle

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\section*{Introduction}
${sectionPlaceholder('introduction')}

\\section*{Results}
${sectionPlaceholder('results')}

\\section*{Discussion}
${sectionPlaceholder('discussion')}

\\section*{Methods}
${sectionPlaceholder('methods')}

\\section*{Data Availability}
${sectionPlaceholder('data-availability')}

\\bibliographystyle{naturemag}
\\bibliography{refs}

\\end{document}`,
}

const THESIS: LatexTemplate = {
  id: 'thesis',
  label: 'PhD / MSc Thesis',
  description: 'Full academic thesis with chapters',
  category: 'thesis',
  bibStyle: 'apalike',
  sections: [
    { name: 'abstract',           label: 'Abstract',           description: 'Overview of research question, methodology, and contributions', wordTarget: 300 },
    { name: 'acknowledgements',   label: 'Acknowledgements',   description: 'Gratitude to supervisors, collaborators, funding bodies', wordTarget: 150 },
    { name: 'introduction',       label: 'Introduction',       description: 'Research context, gap, objectives, thesis structure', wordTarget: 800 },
    { name: 'literature-review',  label: 'Literature Review',  description: 'Comprehensive survey of existing work', wordTarget: 2000 },
    { name: 'methodology',        label: 'Methodology',        description: 'Research design, methods, justification', wordTarget: 1000 },
    { name: 'implementation',     label: 'Implementation',     description: 'Technical implementation details, system architecture', wordTarget: 800 },
    { name: 'results',            label: 'Results',            description: 'Experimental results, data analysis', wordTarget: 1000 },
    { name: 'discussion',         label: 'Discussion',         description: 'Interpretation, comparison with literature', wordTarget: 800 },
    { name: 'conclusion',         label: 'Conclusion',         description: 'Summary of contributions, future work', wordTarget: 400 },
    { name: 'appendix',           label: 'Appendix',           description: 'Supplementary data, proofs, code listings', wordTarget: 500 },
  ],
  mainTexSkeleton: `\\documentclass[12pt,a4paper]{report}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{amsmath,amssymb}
\\usepackage{natbib}
\\usepackage{booktabs}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1.5in}
\\usepackage{setspace}
\\doublespacing

\\title{%%TITLE%%}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents
\\listoffigures
\\listoftables

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\chapter*{Acknowledgements}
${sectionPlaceholder('acknowledgements')}

\\chapter{Introduction}
${sectionPlaceholder('introduction')}

\\chapter{Literature Review}
${sectionPlaceholder('literature-review')}

\\chapter{Methodology}
${sectionPlaceholder('methodology')}

\\chapter{Implementation}
${sectionPlaceholder('implementation')}

\\chapter{Results}
${sectionPlaceholder('results')}

\\chapter{Discussion}
${sectionPlaceholder('discussion')}

\\chapter{Conclusion}
${sectionPlaceholder('conclusion')}

\\appendix
\\chapter{Appendix}
${sectionPlaceholder('appendix')}

\\bibliographystyle{apalike}
\\bibliography{refs}

\\end{document}`,
}

const REPORT: LatexTemplate = {
  id: 'report',
  label: 'Research Report',
  description: 'Technical / industry research report format',
  category: 'other',
  bibStyle: 'apalike',
  sections: [
    { name: 'executive-summary',  label: 'Executive Summary',  description: 'Key findings and recommendations in 1 page', wordTarget: 300 },
    { name: 'background',         label: 'Background',         description: 'Context, scope, and research questions', wordTarget: 400 },
    { name: 'methodology',        label: 'Methodology',        description: 'Research approach, data sources, tools', wordTarget: 400 },
    { name: 'findings',           label: 'Findings',           description: 'What was discovered — data-driven', wordTarget: 600 },
    { name: 'analysis',           label: 'Analysis',           description: 'Interpretation and implications of findings', wordTarget: 500 },
    { name: 'recommendations',    label: 'Recommendations',    description: 'Actionable next steps', wordTarget: 300 },
  ],
  mainTexSkeleton: `\\documentclass[12pt,a4paper]{article}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{amsmath}
\\usepackage{natbib}
\\usepackage{booktabs}
\\usepackage{geometry}
\\geometry{margin=1.2in}

\\title{%%TITLE%%}
\\author{Author Name \\\\ Institution}
\\date{\\today}

\\begin{document}
\\maketitle
\\tableofcontents
\\newpage

\\section*{Executive Summary}
${sectionPlaceholder('executive-summary')}

\\section{Background}
${sectionPlaceholder('background')}

\\section{Methodology}
${sectionPlaceholder('methodology')}

\\section{Findings}
${sectionPlaceholder('findings')}

\\section{Analysis}
${sectionPlaceholder('analysis')}

\\section{Recommendations}
${sectionPlaceholder('recommendations')}

\\bibliographystyle{apalike}
\\bibliography{refs}

\\end{document}`,
}

const BLANK: LatexTemplate = {
  id: 'blank',
  label: 'Blank Paper',
  description: 'Start from scratch with basic sections',
  category: 'other',
  bibStyle: 'plain',
  sections: [
    { name: 'abstract',      label: 'Abstract',      description: 'Brief summary of the paper', wordTarget: 150 },
    { name: 'introduction',  label: 'Introduction',  description: 'Background and motivation', wordTarget: 400 },
    { name: 'body',          label: 'Body',          description: 'Main content of the paper', wordTarget: 1000 },
    { name: 'conclusion',    label: 'Conclusion',    description: 'Summary and future work', wordTarget: 200 },
  ],
  mainTexSkeleton: `\\documentclass[12pt]{article}
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{amsmath}
\\usepackage{booktabs}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{%%TITLE%%}
\\author{Author Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
${sectionPlaceholder('abstract')}
\\end{abstract}

\\section{Introduction}
${sectionPlaceholder('introduction')}

\\section{Body}
${sectionPlaceholder('body')}

\\section{Conclusion}
${sectionPlaceholder('conclusion')}

\\bibliographystyle{plain}
\\bibliography{refs}

\\end{document}`,
}

// ─── Registry ───────────────────────────────────────────────────────────────

export const TEMPLATES: LatexTemplate[] = [
  // AI Conferences
  NEURIPS,
  ICML,
  ICLR,
  CVPR,
  ACL,
  AAAI,
  KDD,
  // Traditional Conferences
  IEEE,
  ACM,
  // Journals
  NATURE,
  // Thesis & Other
  THESIS,
  REPORT,
  BLANK,
]

export const TEMPLATE_MAP: Record<string, LatexTemplate> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t])
)

export function getTemplate(id: string): LatexTemplate | null {
  return TEMPLATE_MAP[id] ?? null
}
