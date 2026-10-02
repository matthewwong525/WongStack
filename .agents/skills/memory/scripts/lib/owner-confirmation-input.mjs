// Pure input validation only. These values are not operator authentication or a grant.
import { exactKeys, requireValue, resourceTarget, opaqueId } from './installation-validation.mjs';

const reviewId = value => opaqueId(value) && value.trim() === value;

export function ownerReviewInput(input) {
  exactKeys(input, ['installation', 'candidateId']);
  const target = resourceTarget(input.installation, true);
  requireValue(Object.values(target).every(value => value === null || value.trim() === value));
  requireValue(reviewId(input.installation.installationId) && reviewId(input.installation.repositoryId) && reviewId(input.candidateId));
  return {
    installation: Object.freeze({ ...target, installationId: input.installation.installationId, repositoryId: input.installation.repositoryId }),
    candidateId: input.candidateId,
  };
}

export function validateMemoryOwnerConfirmation(input) {
  exactKeys(input, ['installation', 'candidateId', 'confirmationId', 'comparisonCode', 'confirmation']);
  const review = ownerReviewInput({ installation: input.installation, candidateId: input.candidateId });
  requireValue(reviewId(input.confirmationId));
  exactKeys(input.confirmation, ['targetReviewed', 'verifiedIdentityReviewed', 'codeMatched']);
  requireValue(Object.values(input.confirmation).every(value => value === true), 'confirmation-required');
  const code = typeof input.comparisonCode === 'string' ? input.comparisonCode.replace('-', '') : '';
  requireValue(code.length === 8 && /^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/.test(input.comparisonCode), 'code-mismatch');
  return Object.freeze({ ...review, confirmationId: input.confirmationId,
    comparisonCode: code,
    confirmation: Object.freeze({ targetReviewed: true, verifiedIdentityReviewed: true, codeMatched: true }),
  });
}
