# Midnight Smart Contracts

This directory contains Compact smart contracts for the Bunty ZKP platform.

## Structure

```
midnight-contract/
├── contracts/          # Compact smart contract source files
├── circuits/           # Compiled circuit definitions
└── scripts/            # Deployment and testing scripts
```

## Contracts

- `income-proof.compact` - Main contract for income, asset, and creditworthiness proofs

## Circuits

- `verifyIncome` - Validates income threshold and employment duration
- `verifyAssets` - Validates net worth (assets - liabilities)
- `verifyCreditworthiness` - Validates credit score and income stability

## Development

Compact smart contracts will be developed in later tasks. This directory is prepared for:
- Contract source files
- Circuit compilation
- Deployment scripts
- Testing utilities

## Requirements

- Midnight Network CLI tools
- Compact compiler
- Node.js 18+
