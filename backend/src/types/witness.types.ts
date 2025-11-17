export interface Witness {
  income: number;
  employmentMonths: number;
  employerHash: string;
  assets: number;
  liabilities: number;
  creditScore: number;
  ssnVerified: boolean;
  selfieVerified: boolean;
  documentVerified: boolean;
  timestamp: number;
}

export interface WitnessCommitment {
  id: string;
  user_id: string;
  witness_hash: string;
  committed_at: Date;
  on_chain_tx_hash: string | null;
}

export interface GenerateWitnessResponse {
  witness: Witness;
  witnessHash: string;
}

export interface CommitHashRequest {
  witnessHash: string;
}

export interface CommitHashResponse {
  commitmentId: string;
  witnessHash: string;
  committedAt: Date;
  onChainTxHash?: string;
}
