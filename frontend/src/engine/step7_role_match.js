export const STATE_WEIGHTS = {
  V: 1.0, // 100%
  S: 0.6, // 60%
  C: 0.2, // 20%
  X: 0.0, // 0%
}

const DEFAULT_ROLE_REQUIREMENTS = {
  'Senior Full Stack TypeScript Engineer': [
    { skill: 'React', importance: 3 },
    { skill: 'TypeScript', importance: 3 },
    { skill: 'REST APIs', importance: 2 },
    { skill: 'Testing', importance: 2 },
    { skill: 'Docker', importance: 1 },
    { skill: 'System design', importance: 2 },
    { skill: 'Git workflow', importance: 1 },
    { skill: 'Kubernetes', importance: 1 },
  ],
  'Backend Distributed Systems Engineer': [
    { skill: 'TypeScript', importance: 2 },
    { skill: 'REST APIs', importance: 3 },
    { skill: 'PostgreSQL', importance: 3 },
    { skill: 'Docker', importance: 2 },
    { skill: 'System design', importance: 3 },
    { skill: 'Testing', importance: 2 },
    { skill: 'Git workflow', importance: 1 },
  ],
  'Frontend Specialist': [
    { skill: 'React', importance: 3 },
    { skill: 'TypeScript', importance: 3 },
    { skill: 'Testing', importance: 3 },
    { skill: 'REST APIs', importance: 2 },
    { skill: 'Git workflow', importance: 1 },
  ],
}

export function executeStep7RoleMatch(skillStates, targetRoleName, onLog = () => {}) {
  onLog(`Initiating Step 7: Calculating evidence-weighted role match for "${targetRoleName}"...`)

  // Find or synthesize requirements for target role
  const roleReqs = DEFAULT_ROLE_REQUIREMENTS[targetRoleName] || [
    { skill: 'React', importance: 3 },
    { skill: 'TypeScript', importance: 3 },
    { skill: 'REST APIs', importance: 2 },
    { skill: 'Testing', importance: 2 },
    { skill: 'Docker', importance: 1 },
    { skill: 'Git workflow', importance: 1 },
  ]

  let totalMaxWeight = 0
  let earnedScore = 0

  const stateMap = {}
  skillStates.forEach((s) => {
    stateMap[s.skill] = s.state
  })

  const gaps = []

  roleReqs.forEach((req) => {
    const currentState = stateMap[req.skill] || 'C'
    const factor = STATE_WEIGHTS[currentState] !== undefined ? STATE_WEIGHTS[currentState] : 0.2
    
    earnedScore += req.importance * factor
    totalMaxWeight += req.importance

    // Calculate gap if not verified
    if (currentState !== 'V') {
      const currentPoints = req.importance * factor
      const maxPoints = req.importance * 1.0
      const potentialBoostPoints = maxPoints - currentPoints

      gaps.push({
        skill: req.skill,
        currentState,
        importance: req.importance,
        potentialBoost: potentialBoostPoints,
        recommendation:
          currentState === 'S'
            ? 'Complete a targeted micro-check to upgrade to Verified (+40% state credit).'
            : currentState === 'C'
            ? 'Link a public commit or PR implementing this skill to move from Claimed to Verified (+80% credit).'
            : 'Resolve conflict by demonstrating original commits in a non-forked repository.',
      })
    }
  })

  const matchPercentage = Math.round((earnedScore / totalMaxWeight) * 100)

  // Rank gaps by impact
  gaps.sort((a, b) => b.potentialBoost - a.potentialBoost)

  // Breakdown counts
  const breakdown = {
    V: skillStates.filter((s) => s.state === 'V').length,
    S: skillStates.filter((s) => s.state === 'S').length,
    C: skillStates.filter((s) => s.state === 'C').length,
    X: skillStates.filter((s) => s.state === 'X').length,
  }

  onLog(`Step 7 Complete: Computed evidence-weighted match = ${matchPercentage}%. Identified ${gaps.length} ranked skill gaps.`)

  return {
    matchPercentage,
    earnedScore,
    totalMaxWeight,
    breakdown,
    rankedGaps: gaps,
    roleReqs,
    disclaimer: 'No single hire score: ProofPass provides a weighted evidence match breakdown, not a binary hiring decision.',
  }
}
