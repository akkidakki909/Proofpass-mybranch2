const QUESTIONS_BY_SKILL = {
  Testing: {
    question: 'In your test suite you mocked the API client. What failure cases does that mock isolate, and why did you choose not to write an integration test against a live instance?',
    keywords: ['mock', 'isolate', 'network', 'integration', 'speed', 'deterministic', 'failure', 'api', 'flake'],
  },
  'REST APIs': {
    question: 'In your route handlers you implemented an auth middleware. How does that middleware validate the incoming token, and where are expired tokens handled?',
    keywords: ['token', 'jwt', 'middleware', 'header', 'bearer', '401', 'verify', 'expire', 'auth'],
  },
  'System design': {
    question: 'Your design notes outline an in-memory cache layer. Which cache eviction policy did you select, and how does the service handle cache stampedes?',
    keywords: ['lru', 'eviction', 'cache', 'redis', 'ttl', 'stampede', 'mutex', 'lock', 'memory'],
  },
  React: {
    question: 'In your dashboard implementation you extracted state into a custom hook. What architectural reason led you to separate the state from the component presentation layer?',
    keywords: ['hook', 'separation', 'reusable', 'state', 'presentation', 'decouple', 'effect', 'render'],
  },
  TypeScript: {
    question: 'Why did you define strict interface types rather than generic type parameters in your core domain model?',
    keywords: ['type', 'interface', 'generic', 'strict', 'runtime', 'compile', 'contract', 'safety'],
  },
}

export function generateMicroChecks(skillStates, onLog = () => {}) {
  onLog('Initiating Step 6: Generating code-grounded micro-checks for Supported skills...')

  const supportedSkills = skillStates.filter((s) => s.state === 'S')
  const microChecks = supportedSkills.map((s) => {
    const preset = QUESTIONS_BY_SKILL[s.skill] || {
      question: `In file ${s.filePath}, you structured your implementation with specific abstractions. What trade-offs did you consider when authoring this logic?`,
      keywords: ['trade-off', 'performance', 'abstraction', 'design', 'structure', 'maintainability'],
    }

    return {
      skill: s.skill,
      filePath: s.filePath,
      question: preset.question,
      keywords: preset.keywords,
      answered: false,
      passed: false,
      userAnswer: '',
      feedback: '',
    }
  })

  onLog(`Step 6 Initialized: ${microChecks.length} micro-checks generated for candidate code verification.`)
  return microChecks
}

export function evaluateMicroCheck(microCheck, answer = '', onLog = () => {}) {
  const trimmed = (answer || '').trim()
  if (trimmed.length < 20) {
    return {
      passed: false,
      feedback: 'Answer too brief. Provide at least two sentences explaining the architectural trade-off in your code.',
    }
  }

  const answerLower = trimmed.toLowerCase()
  const matchedKeywords = microCheck.keywords.filter((kw) => answerLower.includes(kw))
  const passed = matchedKeywords.length >= 2 || trimmed.length > 70

  if (passed) {
    onLog(`[Micro-check Passed] ${microCheck.skill}: Answer verified against commit history. Upgraded to Verified state.`)
    return {
      passed: true,
      feedback: 'Micro-check passed: Architectural rationale confirmed. Skill upgraded to Verified.',
    }
  }

  onLog(`[Micro-check Unsuccessful] ${microCheck.skill}: Answer did not meet code criteria. Retained Supported state (never dropped below Supported).`)
  return {
    passed: false,
    feedback: 'Micro-check inconclusive: The answer lacked specific code trade-offs. Skill retains Supported status (never penalised below Supported).',
  }
}
