export const PRIVACY = {
  title: 'Privacy Policy',
  date: 'Last updated 11 October 2026',
  intro: 'ProofPass is an evidence-first skill passport verification service. This policy describes how we collect, process, and protect your data when you submit verification inputs.',
  sections: [
    ['Resume and Document Processing', 'When you upload a resume (PDF or DOCX) or paste resume text, we extract technical skill claims, project references, and professional experience. We do not store full resume documents after verification is complete.'],
    ['GitHub Profile and Repository Access', 'When you provide a GitHub profile URL, our engine queries the GitHub REST API for public repository metadata, file trees, commit logs, and git blame authorship attribution. For private repositories, access is strictly read-only and requires explicit OAuth consent. Source code files are inspected in-memory and are never permanently stored or used to train public models.'],
    ['Project ZIP Archives', 'When you upload a project ZIP archive, files are unpacked directly in your browser or ephemeral execution sandbox. Source files and line counts are parsed to verify code existence and compute cryptographic SHA-256 file hashes. Project files are purged immediately after passport hashing.'],
    ['Certificate Verification', 'When you supply certificate links or upload credential files, we parse issuing organization metadata, issue dates, and public credential IDs to correlate with your target role requirements.'],
    ['Language Model and AI Usage', 'Selected code snippets and resume claims are sent to language models strictly to propose initial evidence pointers (file paths, line ranges, and commits). All proposals are advisory and are subject to deterministic code validation. Language models never assign final trust states.'],
    ['Cryptographic Passports and Sharing', 'Your skill passport is private by default. A cryptographic SHA-256 digest is generated from the final verified evidence states. Anyone with your passport link can verify that the claims have not been tampered with since issue.'],
    ['Data Retention and Your Rights', 'You can delete your verification records, revoke repository access tokens, and purge issued passports at any time. We do not sell candidate data or share profiles without explicit candidate authorization.'],
    ['Contact', 'For questions regarding privacy, contact privacy@proofpass.example.'],
  ],
}

export const TERMS = {
  title: 'Terms and Conditions',
  date: 'Last updated 11 October 2026',
  intro: 'These terms govern your use of ProofPass. By submitting resumes, repository links, project archives, or certificates, you agree to these conditions.',
  sections: [
    ['User Ownership and Authorization', 'You represent and warrant that you own or have all necessary authorizations to submit the resume, repositories, project code, and certificates provided for verification. You must not submit code authored by third parties without permission or present tutorial repositories as original work.'],
    ['Evidence Verification Scope', 'A ProofPass passport records what our deterministic engine and evidence checks could verify at the time of issue. A Verified state indicates that code exists, authorship attribution passed, and commit criteria were satisfied. It is not an absolute warranty of future job performance.'],
    ['Anti-Inflation and Anti-Fraud Standards', 'Repositories that are unedited forks of public tutorials with zero original commits are labeled Contradicted. Attempts to bypass hash checks or manipulate git blame author metadata will result in passport invalidation.'],
    ['Micro-Checks and Skill Upgrades', 'Supported skills may be upgraded to Verified by answering code-grounded micro-checks. Micro-check responses are evaluated against commit history. A failed micro-check never lowers a skill state below Supported.'],
    ['No Binary Hire Score', 'ProofPass provides evidence-weighted role match percentages and ranked skill gaps. We do not issue automated binary hiring decisions. Recruiters and employers remain solely responsible for employment decisions.'],
    ['Limitation of Liability', 'ProofPass is provided on an as-is basis. To the maximum extent permitted by applicable law, ProofPass disclaims liability for decisions made by third parties based on passport records.'],
    ['Modifications to Terms', 'We reserve the right to modify these terms as new evidence sources and verification modules are deployed. Continued use constitutes acceptance of updated terms.'],
    ['Contact', 'For legal notices, contact legal@proofpass.example.'],
  ],
}
