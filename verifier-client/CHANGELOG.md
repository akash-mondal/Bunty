# Changelog

All notable changes to the Bunty Verifier Client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Initial release of @bunty/verifier-client
- `BuntyVerifierClient` class for proof verification
- `verifyProof()` method for nullifier-based verification
- `getUserProofs()` method for DID-based queries
- `getProofsWithFilters()` method for custom filtering
- `isProofValid()` convenience method
- `getValidProofCount()` helper method
- `subscribeToProofs()` for real-time updates (placeholder)
- `subscribeToUserProofs()` for user-specific subscriptions (placeholder)
- Full TypeScript type definitions
- Comprehensive documentation and examples
- Integration guide for common use cases
- Example implementations for lending, rental, and DeFi platforms

### Features
- GraphQL client for Midnight Network indexer
- Configurable timeout support
- Error handling with descriptive messages
- Zero-knowledge proof validation
- Proof expiry checking
- User proof history queries

### Documentation
- README with full API reference
- Integration guide with best practices
- Example code for lending platforms
- Example code for rental verification
- Example code for DeFi protocols
- TypeScript usage examples

## [Unreleased]

### Planned
- WebSocket support for real-time subscriptions
- Proof caching layer
- Retry logic with exponential backoff
- Batch verification support
- Proof analytics and reporting
- CLI tool for testing
- React hooks for frontend integration
- Additional query filters (date ranges, threshold ranges)
