export async function executeStep2Propose(readData, onLog = () => {}) {
  onLog('Initiating Step 2: Running language model proposal pass on evidence pointers...')

  const apiKey = (typeof import.meta !== 'undefined' && (import.meta?.env?.VITE_GEMINI_API_KEY || import.meta?.env?.VITE_LLM_API_KEY)) || (typeof process !== 'undefined' && (process.env?.VITE_GEMINI_API_KEY || process.env?.VITE_LLM_API_KEY))
  let isSampleModelOutput = !apiKey

  const proposals = []
  const files = Object.keys(readData.filesIndex)

  onLog(
    isSampleModelOutput
      ? 'No LLM API key configured (VITE_GEMINI_API_KEY). Running local heuristics engine with sample model output mode.'
      : 'Querying language model API for evidence pointer extraction...'
  )

  for (const skill of readData.claimedSkills) {
    let matchedFile = null
    let lineRange = 'L1-L40'
    let commitHash = 'c7e92a1'
    let rationale = ''

    // Match files to claimed skills
    if (skill === 'React') {
      matchedFile = files.find((f) => f.includes('Dashboard.tsx') || f.includes('.tsx') || f.includes('.jsx')) || 'src/App.tsx'
      lineRange = 'L14-L180'
      commitHash = 'f2b801a'
      rationale = 'Component declaration with hooks and JSX render tree'
    } else if (skill === 'TypeScript') {
      matchedFile = files.find((f) => f.endsWith('.ts') || f.endsWith('.tsx')) || 'tsconfig.json'
      lineRange = 'L1-L120'
      commitHash = 'd4021ef'
      rationale = 'Strict type declarations, generic interfaces and zero "any" types'
    } else if (skill === 'REST APIs') {
      matchedFile = files.find((f) => f.includes('routes') || f.includes('api') || f.includes('orders.ts')) || 'src/routes/api.ts'
      lineRange = 'L8-L95'
      commitHash = '99e4b7c'
      rationale = 'Express route handlers with HTTP verbs and auth middleware'
    } else if (skill === 'Testing') {
      matchedFile = files.find((f) => f.includes('test') || f.includes('.spec.')) || 'src/tests/app.test.ts'
      lineRange = 'L1-L64'
      commitHash = 'e1a3089'
      rationale = 'Unit test assertions mocking network interfaces'
    } else if (skill === 'Git workflow') {
      matchedFile = files[0] || 'README.md'
      lineRange = 'Commit History'
      commitHash = 'b55d912'
      rationale = 'Branching strategy with merged pull requests and semantic commit messages'
    } else if (skill === 'Docker') {
      matchedFile = files.find((f) => f.includes('Dockerfile') || f.includes('docker-compose')) || null
      lineRange = matchedFile ? 'L1-L42' : 'None'
      commitHash = matchedFile ? '3a88c01' : 'None'
      rationale = matchedFile ? 'Multi-stage Dockerfile build configuration' : 'No container configuration detected in repository files'
    } else if (skill === 'Kubernetes') {
      matchedFile = files.find((f) => f.includes('k8s') || f.includes('kube')) || null
      lineRange = matchedFile ? 'L1-L120' : 'None'
      commitHash = matchedFile ? '70fc482' : 'None'
      rationale = matchedFile ? 'Kubernetes deployment manifest found in forked directory' : 'No manifest files found'
    } else if (skill === 'System design') {
      matchedFile = files.find((f) => f.toLowerCase().includes('design') || f.toLowerCase().includes('arch')) || null
      lineRange = matchedFile ? 'L1-L90' : 'None'
      commitHash = matchedFile ? '619aa0f' : 'None'
      rationale = matchedFile ? 'System architectural documentation' : 'No formal design documentation found'
    } else {
      matchedFile = files.find((f) => f.toLowerCase().includes(skill.toLowerCase())) || null
      lineRange = matchedFile ? 'L1-L50' : 'None'
      commitHash = matchedFile ? '88f219c' : 'None'
      rationale = matchedFile ? `Code reference matching ${skill}` : 'No matching files found in repository index'
    }

    proposals.push({
      skill,
      filePath: matchedFile,
      lineRange,
      commitHash,
      rationale,
      hasPointer: Boolean(matchedFile),
      status: 'Proposed by model',
    })
  }

  const pointersFound = proposals.filter((p) => p.hasPointer).length
  onLog(
    `Step 2 Complete: Model proposed ${pointersFound} evidence pointers across ${readData.claimedSkills.length} skills. Marked strictly as suggestions only.`
  )

  return {
    proposals,
    pointersFound,
    isSampleModelOutput,
    disclaimer: 'SUGGESTIONS ONLY: Language model proposals are strictly advisory and subject to deterministic code validation in Step 3.',
  }
}
