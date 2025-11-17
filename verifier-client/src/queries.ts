import { gql } from 'graphql-request';

/**
 * Query to fetch a single proof by nullifier
 */
export const GET_PROOF_BY_NULLIFIER = gql`
  query GetProofByNullifier($nullifier: String!) {
    proofRecord(nullifier: $nullifier) {
      nullifier
      threshold
      timestamp
      expiresAt
      userDID
      isValid
      isExpired
    }
  }
`;

/**
 * Query to fetch all proofs for a user by DID
 */
export const GET_PROOFS_BY_USER = gql`
  query GetProofsByUser($userDID: String!) {
    proofRecords(where: { userDID: $userDID }) {
      nullifier
      threshold
      timestamp
      expiresAt
      userDID
      isValid
      isExpired
    }
  }
`;

/**
 * Query to fetch proofs with filters
 */
export const GET_PROOFS_WITH_FILTERS = gql`
  query GetProofsWithFilters(
    $userDID: String
    $minThreshold: Int
    $isValid: Boolean
  ) {
    proofRecords(
      where: {
        userDID: $userDID
        threshold_gte: $minThreshold
        isValid: $isValid
      }
    ) {
      nullifier
      threshold
      timestamp
      expiresAt
      userDID
      isValid
      isExpired
    }
  }
`;

/**
 * Subscription for new proof submissions
 */
export const SUBSCRIBE_TO_PROOFS = gql`
  subscription OnNewProof {
    proofSubmitted {
      nullifier
      threshold
      timestamp
      expiresAt
      userDID
      isValid
      isExpired
    }
  }
`;

/**
 * Subscription for proofs by specific user
 */
export const SUBSCRIBE_TO_USER_PROOFS = gql`
  subscription OnUserProof($userDID: String!) {
    proofSubmitted(where: { userDID: $userDID }) {
      nullifier
      threshold
      timestamp
      expiresAt
      userDID
      isValid
      isExpired
    }
  }
`;
