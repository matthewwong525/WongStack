// Trusted-process read-only preparation. No durable review receipt or confirmation
// is issued. Do not expose this helper as the planned owner operator API yet.
import { requireValue, accessConfiguration, rows, digest, MemoryOperatorError } from './installation-validation.mjs';
import { inspectResources, inspectProtection, protectionDigest, canonicalMemoryValue, humanAdmitted } from './installation-resources.mjs';
import { readInstallation, migrationManifestHash } from './installation-state.mjs';
import { ownerReviewInput } from './owner-confirmation-input.mjs';

export async function readOwnerEnvironment(operator, input, allowOutcome = false) {
  const { installation, candidateId } = ownerReviewInput(input);
  const resources = await inspectResources(operator, installation);
  const state = await readInstallation(operator, installation);
  requireValue(state && state.installation_id === installation.installationId && state.repository_id === installation.repositoryId, 'installation-conflict');
  if (!allowOutcome) requireValue(state.state === 'pending', 'candidate-unavailable');
  let access;
  try { access = accessConfiguration(state.access_json === null ? null : JSON.parse(state.access_json)); }
  catch { throw new MemoryOperatorError('installation-conflict'); }
  requireValue(await inspectProtection(operator, installation, access, resources) === null, 'protection-unavailable');
  requireValue(humanAdmitted(resources, access.appApplicationId, state.owner_email), 'protection-unavailable');
  return { operator, installation, candidateId, state, access, manifestHash: await migrationManifestHash(),
    protectionHash: await protectionDigest(resources), targetHash: await digest(JSON.stringify(canonicalMemoryValue(installation))) };
}

export async function readOwnerCandidate(context) {
  const { operator, installation, candidateId, state, access } = context;
  const candidates = await rows(operator, installation, `SELECT candidate.*,
      provider.id AS provider_id, provider.issuer
    FROM memory_login_candidates candidate
    JOIN memory_installation i ON i.installation_id = candidate.installation_id
    JOIN memory_installation_configuration config ON config.installation_id = i.installation_id
    JOIN memory_providers provider ON provider.installation_id = i.installation_id AND provider.id = candidate.provider_id
    JOIN memory_owner_intents intent ON intent.installation_id = i.installation_id AND intent.provider_id = provider.id
    WHERE candidate.id = ? AND i.installation_id = ? AND i.repository_id = ? AND i.state = 'pending'
      AND i.auth_revision = ? AND config.pin_revision = ? AND config.access_json = ?
      AND candidate.purpose = 'owner' AND candidate.state = 'pending' AND candidate.consumed_principal_id IS NULL
      AND candidate.created_at <= unixepoch() AND candidate.expires_at > unixepoch()
      AND candidate.expires_at <= candidate.created_at + 600
      AND provider.status = 'active' AND provider.id = ? AND provider.issuer = ? AND provider.audience = ?
      AND candidate.issuer = provider.issuer AND intent.state = 'pending'
      AND candidate.verified_email = intent.email AND intent.email = config.owner_email
      AND NOT EXISTS (SELECT 1 FROM memory_memberships member WHERE member.installation_id = i.installation_id
        AND member.role = 'owner' AND member.status = 'active')`,
  [candidateId, installation.installationId, installation.repositoryId, state.auth_revision, state.pin_revision,
    state.access_json, access.providerConfigurationId, access.issuer, access.audience]);
  requireValue(candidates.length === 1, 'candidate-unavailable');
  const candidate = candidates[0];
  requireValue(candidate.id === candidateId && candidate.provider_id === access.providerConfigurationId && candidate.issuer === access.issuer &&
    candidate.verified_email === state.owner_email && Number.isSafeInteger(candidate.expires_at), 'candidate-unavailable');
  requireValue(typeof candidate.subject === 'string' && candidate.subject.trim().length > 0 &&
    typeof candidate.code_hash === 'string' && /^[a-f0-9]{64}$/.test(candidate.code_hash) && Number.isSafeInteger(candidate.created_at), 'candidate-unavailable');
  const snapshotHash = await digest(JSON.stringify(canonicalMemoryValue({ version: 1, candidate: {
    id: candidate.id, installationId: candidate.installation_id, providerId: candidate.provider_id, issuer: candidate.issuer,
    subject: candidate.subject, verifiedEmail: candidate.verified_email, codeHash: candidate.code_hash,
    purpose: candidate.purpose, state: candidate.state, consumedPrincipalId: candidate.consumed_principal_id,
    createdAt: candidate.created_at, expiresAt: candidate.expires_at },
    installation, ownerEmail: state.owner_email, authRevision: state.auth_revision, pinRevision: state.pin_revision,
    access, manifestHash: context.manifestHash, protectionHash: context.protectionHash })));
  return { ...context, candidate, snapshotHash };
}

export function ownerDisplay({ installation, candidateId, candidate }) {
  return Object.freeze({ candidateId, installation, verifiedEmail: candidate.verified_email,
    providerConfigurationId: candidate.provider_id, issuer: candidate.issuer, expiresAt: candidate.expires_at });
}

export async function readMemoryOwnerReview(operator, input) {
  return ownerDisplay(await readOwnerCandidate(await readOwnerEnvironment(operator, input)));
}
