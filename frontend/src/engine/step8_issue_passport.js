export async function computePassportHash(skillStates) {
  const normalized = skillStates.map((s) => [s.skill, s.state, s.evidence || ''])
  const jsonStr = JSON.stringify(normalized)
  const encoder = new TextEncoder()
  const data = encoder.encode(jsonStr)

  try {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  }
}

export async function executeStep8IssuePassport(skillStates, targetRole, candidateName = 'Alex Rivera', onLog = () => {}) {
  onLog('Initiating Step 8: Computing cryptographic SHA-256 digest and sealing skill passport...')

  const hash = await computePassportHash(skillStates)
  const passportId = `PP-2026-${Math.floor(1000 + Math.random() * 9000)}`
  const issuedDate = new Date().toISOString()

  const passport = {
    id: passportId,
    candidate: candidateName,
    targetRole,
    issuedAt: issuedDate,
    hash,
    skills: skillStates.map((s) => ({
      skill: s.skill,
      state: s.state,
      evidence: s.evidence,
      rationale: s.rationale,
      lineShare: s.lineShare,
    })),
  }

  onLog(`Step 8 Complete: Skill Passport issued with ID ${passportId}. SHA-256 seal: ${hash.slice(0, 16)}...`)

  return {
    passport,
    hash,
    tampered: false,
  }
}

export async function verifyPassportIntegrity(skills, expectedHash) {
  const currentHash = await computePassportHash(skills)
  if (currentHash === expectedHash) {
    return {
      valid: true,
      currentHash,
      message: 'Hash matches. Passport is authentic and unchanged since issue.',
    }
  }
  return {
    valid: false,
    currentHash,
    message: 'Hash mismatch. Evidence or state has been edited after issue.',
  }
}

export async function simulateTamperEdit(skills) {
  // Alter the first skill that is not verified to 'V' or change first verified to 'S'
  const tamperedSkills = skills.map((s, idx) => {
    if (idx === 0) {
      return {
        ...s,
        state: s.state === 'V' ? 'S' : 'V',
        evidence: `${s.evidence} (MODIFIED)`,
      }
    }
    return s
  })

  const newHash = await computePassportHash(tamperedSkills)
  return {
    tamperedSkills,
    newHash,
  }
}
