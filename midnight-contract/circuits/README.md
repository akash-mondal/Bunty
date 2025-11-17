# Midnight Circuits

This directory contains compiled circuit definitions for the Midnight proof server.

## Overview

Circuits are compiled from Compact smart contracts and define the zero-knowledge proof logic. The proof server uses these circuit definitions to generate BLS12-381 proofs.

## Circuit Types

### 1. verifyIncome
Validates that a user's income meets a specified threshold and employment duration requirements.

**Public Inputs:**
- `threshold`: Minimum income required

**Private Witness:**
- `income`: User's monthly income
- `employmentMonths`: Duration of employment
- `employerHash`: Hash of employer information
- `ssnVerified`: SSN verification status
- `selfieVerified`: Selfie verification status

**Constraints:**
- Income >= threshold
- Employment duration >= 6 months
- SSN and selfie verified

### 2. verifyAssets
Validates that a user's net worth (assets - liabilities) meets a minimum threshold.

**Public Inputs:**
- `minimumAssets`: Minimum net worth required

**Private Witness:**
- `assets`: Total asset value
- `liabilities`: Total liability value
- `ssnVerified`: SSN verification status

**Constraints:**
- Net worth (assets - liabilities) >= minimumAssets
- SSN verified

### 3. verifyCreditworthiness
Validates credit score and income stability.

**Public Inputs:**
- `minimumScore`: Minimum credit score required

**Private Witness:**
- `creditScore`: User's credit score
- `income`: User's monthly income
- `employmentMonths`: Duration of employment

**Constraints:**
- Credit score >= minimumScore
- Income > 0
- Employment duration >= 12 months

## Compiling Circuits

To compile circuits from Compact contracts:

```bash
cd midnight-contract
npm run compile
```

This will:
1. Compile the `income-proof.compact` contract
2. Generate circuit definitions
3. Output compiled circuits to the `circuits/` directory

## Circuit Files

After compilation, you should see:

```
circuits/
├── verifyIncome.circuit
├── verifyAssets.circuit
├── verifyCreditworthiness.circuit
└── README.md
```

## Using Circuits with Proof Server

The proof server automatically loads circuits from the `/circuits` directory when it starts.

### Docker Volume Mount

In `docker-compose.yml`:

```yaml
proof-server:
  image: midnightnetwork/proof-server:latest
  volumes:
    - ./midnight-contract/circuits:/circuits
```

### Verifying Circuits are Loaded

Check proof server logs:

```bash
docker logs bunty-proof-server
```

You should see:
```
Loaded circuit: verifyIncome
Loaded circuit: verifyAssets
Loaded circuit: verifyCreditworthiness
```

## Circuit Development

### Adding a New Circuit

1. Add circuit definition to `contracts/income-proof.compact`:

```compact
export circuit myNewCircuit(publicInput: Field) {
  // Circuit logic here
  assert(privateWitness.value >= publicInput);
  
  // Generate nullifier
  let nullifier = sha256(privateWitness.value, getCurrentUser());
  
  // Store in registry
  proofRegistry[nullifier] = ProofRecord { ... };
  
  return { nullifier, timestamp, expiresAt };
}
```

2. Compile the contract:

```bash
npm run compile
```

3. Restart the proof server:

```bash
docker-compose restart proof-server
```

4. Update backend types in `backend/src/types/proof.types.ts`:

```typescript
export type CircuitType = 
  | 'verifyIncome' 
  | 'verifyAssets' 
  | 'verifyCreditworthiness'
  | 'myNewCircuit'; // Add new circuit
```

### Testing Circuits

Test circuits using the Compact test framework:

```bash
cd midnight-contract
npm test
```

## Troubleshooting

### Circuits Not Loading

If the proof server can't find circuits:

1. Verify circuits directory exists:
   ```bash
   ls -la midnight-contract/circuits/
   ```

2. Check Docker volume mount:
   ```bash
   docker exec bunty-proof-server ls /circuits
   ```

3. Verify circuit files have correct permissions:
   ```bash
   chmod 644 midnight-contract/circuits/*.circuit
   ```

### Compilation Errors

If circuit compilation fails:

1. Check Compact syntax in contract files
2. Verify Midnight CLI is installed:
   ```bash
   midnight --version
   ```
3. Check compilation logs for specific errors

### Proof Generation Fails

If proof generation fails with circuit errors:

1. Verify witness data matches circuit expectations
2. Check public inputs are correctly formatted
3. Ensure constraints are satisfiable with provided witness

## Circuit Security

### Best Practices

1. **Nullifier Generation**: Always include user DID in nullifier to prevent cross-user replay
2. **Constraint Validation**: Validate all inputs and constraints thoroughly
3. **Expiry Logic**: Include expiry timestamps to limit proof validity
4. **Replay Prevention**: Check nullifier uniqueness before storing

### Security Considerations

- Circuits are public - don't include sensitive logic
- Witness data must remain private (never logged or stored)
- Public outputs should not leak private information
- Test circuits with edge cases and boundary conditions

## Performance

### Proof Generation Time

- Simple circuits (1-2 constraints): ~1-2 seconds
- Medium circuits (5-10 constraints): ~2-5 seconds
- Complex circuits (20+ constraints): ~5-10 seconds

### Optimization Tips

1. Minimize number of constraints
2. Use efficient hash functions (sha256 over sha512)
3. Batch similar operations
4. Avoid unnecessary field operations

## References

- [Compact Language Documentation](https://docs.midnight.network/compact)
- [Circuit Design Best Practices](https://docs.midnight.network/circuits)
- [BLS12-381 Curve Specification](https://electriccoin.co/blog/new-snark-curve/)
