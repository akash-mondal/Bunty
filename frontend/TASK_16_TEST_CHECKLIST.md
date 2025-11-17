# Task 16: Proof Submission Flow - Testing Checklist

## Pre-requisites
- [ ] Backend server running on port 3001
- [ ] Proof server running on port 6300
- [ ] Midnight Network node accessible
- [ ] PostgreSQL database initialized
- [ ] Redis cache running
- [ ] Lace Wallet browser extension installed
- [ ] User registered and logged in
- [ ] Bank accounts linked via Plaid
- [ ] Identity verified via Stripe
- [ ] Witness data constructed

## Test Scenarios

### 1. Happy Path - Complete Flow
- [ ] Navigate to `/dashboard/proofs`
- [ ] Select circuit type (e.g., "Verify Income")
- [ ] Enter threshold amount (e.g., 50000)
- [ ] Click "Generate Proof"
- [ ] Wait for proof generation to complete
- [ ] Verify proof is displayed with nullifier and expiry
- [ ] Click "Submit to Blockchain →"
- [ ] Verify redirect to `/dashboard/submit-proof`
- [ ] Verify proof summary is displayed correctly
- [ ] Connect Lace Wallet (if not connected)
- [ ] Verify wallet details are displayed (address, network, balance)
- [ ] Click "Sign & Submit to Blockchain"
- [ ] Approve transaction in Lace Wallet popup
- [ ] Verify redirect to `/dashboard/proof-confirmation`
- [ ] Verify transaction hash is displayed
- [ ] Verify status shows "PENDING"
- [ ] Wait for status to update to "CONFIRMED" (polling)
- [ ] Verify "Proof Confirmed!" message appears
- [ ] Verify all proof details are displayed
- [ ] Test copy functionality for each field
- [ ] Test "Copy Credentials" button for JSON
- [ ] Verify blockchain explorer link works
- [ ] Click "Generate Another Proof" and verify navigation

### 2. Wallet Connection Tests
- [ ] Start flow without wallet connected
- [ ] Verify warning message appears
- [ ] Click "Connect Lace Wallet"
- [ ] Approve connection in wallet
- [ ] Verify wallet details appear
- [ ] Disconnect wallet mid-flow
- [ ] Verify error handling

### 3. Transaction Signing Tests
- [ ] Start submission flow
- [ ] Reject transaction signature in wallet
- [ ] Verify error message appears
- [ ] Verify user can retry
- [ ] Sign transaction successfully
- [ ] Verify submission proceeds

### 4. Status Polling Tests
- [ ] Submit proof successfully
- [ ] Verify initial status is "PENDING"
- [ ] Observe status polling (every 5 seconds)
- [ ] Verify UI updates when status changes
- [ ] Test timeout scenario (wait 2+ minutes)
- [ ] Verify timeout message appears
- [ ] Manually refresh status
- [ ] Verify confirmed status stops polling

### 5. Copy Functionality Tests
- [ ] Copy transaction hash
- [ ] Verify clipboard contains correct value
- [ ] Verify "✓" confirmation appears
- [ ] Copy proof ID
- [ ] Copy nullifier
- [ ] Copy complete JSON credentials
- [ ] Verify JSON is valid and formatted

### 6. Navigation Tests
- [ ] Navigate to submission page without proof data
- [ ] Verify error message and redirect option
- [ ] Navigate to confirmation page without params
- [ ] Verify error message
- [ ] Use browser back button during flow
- [ ] Verify state is maintained correctly
- [ ] Refresh page during submission
- [ ] Verify appropriate error handling

### 7. Error Scenarios
- [ ] Backend API unavailable
  - Verify error message
  - Verify retry option
- [ ] Network timeout
  - Verify timeout handling
  - Verify user feedback
- [ ] Invalid proof data
  - Verify validation error
  - Verify clear error message
- [ ] Duplicate nullifier (replay attack)
  - Verify backend rejects
  - Verify error message to user
- [ ] Wallet not installed
  - Verify installation prompt
  - Verify helpful error message

### 8. UI/UX Tests
- [ ] Verify all loading states show spinners
- [ ] Verify all buttons have hover effects
- [ ] Verify disabled states are visually clear
- [ ] Verify error messages are readable
- [ ] Verify success messages are prominent
- [ ] Verify copy buttons provide feedback
- [ ] Verify responsive layout on mobile
- [ ] Verify text is readable and well-formatted
- [ ] Verify colors match design system
- [ ] Verify icons are appropriate

### 9. Data Persistence Tests
- [ ] Generate proof
- [ ] Verify data stored in localStorage
- [ ] Navigate to submission page
- [ ] Verify data loaded correctly
- [ ] Complete submission
- [ ] Verify localStorage is cleared
- [ ] Try to navigate back to submission
- [ ] Verify no stale data

### 10. Security Tests
- [ ] Verify JWT token is sent with API requests
- [ ] Verify unauthorized requests are rejected
- [ ] Verify wallet signature is required
- [ ] Verify nullifier uniqueness is enforced
- [ ] Verify proof expiry is validated
- [ ] Verify no sensitive data in URLs
- [ ] Verify no sensitive data in console logs

### 11. Blockchain Explorer Tests
- [ ] Click "View on Explorer" link
- [ ] Verify opens in new tab
- [ ] Verify correct transaction hash in URL
- [ ] Verify explorer page loads (if available)

### 12. Proof Sharing Tests
- [ ] Copy individual fields
- [ ] Paste into text editor
- [ ] Verify format is correct
- [ ] Copy JSON credentials
- [ ] Parse JSON in validator
- [ ] Verify all fields present
- [ ] Verify values are correct

### 13. Multiple Proof Tests
- [ ] Submit first proof
- [ ] Wait for confirmation
- [ ] Generate second proof
- [ ] Submit second proof
- [ ] Verify both proofs tracked separately
- [ ] Verify no interference between submissions

### 14. Edge Cases
- [ ] Very long nullifier strings
- [ ] Very large threshold values
- [ ] Proof expiring during submission
- [ ] Network disconnection during polling
- [ ] Browser tab closed during submission
- [ ] Multiple tabs open simultaneously

## Performance Tests
- [ ] Measure time from submission to confirmation
- [ ] Verify polling doesn't cause performance issues
- [ ] Verify page load times are acceptable
- [ ] Verify no memory leaks during polling
- [ ] Verify smooth animations and transitions

## Accessibility Tests
- [ ] Verify keyboard navigation works
- [ ] Verify screen reader compatibility
- [ ] Verify color contrast meets standards
- [ ] Verify focus indicators are visible
- [ ] Verify error messages are announced

## Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on mobile browsers

## Integration Tests
- [ ] Verify backend receives correct data
- [ ] Verify database records are created
- [ ] Verify Midnight Network receives transaction
- [ ] Verify status updates propagate correctly
- [ ] Verify proof can be queried by verifiers

## Regression Tests
- [ ] Verify proof generation still works
- [ ] Verify witness construction still works
- [ ] Verify wallet connection still works
- [ ] Verify other dashboard pages still work
- [ ] Verify authentication still works

## Documentation Tests
- [ ] Verify TASK_16_SUMMARY.md is accurate
- [ ] Verify PROOF_SUBMISSION_FLOW.md is clear
- [ ] Verify code comments are helpful
- [ ] Verify error messages are documented

## Sign-off Criteria
- [ ] All happy path tests pass
- [ ] All error scenarios handled gracefully
- [ ] No console errors or warnings
- [ ] No TypeScript errors
- [ ] Code follows project conventions
- [ ] UI matches design specifications
- [ ] Performance is acceptable
- [ ] Security requirements met
- [ ] Documentation is complete

## Known Limitations
1. Proof history page shows placeholder (API endpoint not implemented)
2. Blockchain explorer URL is placeholder (update when available)
3. Polling timeout is fixed at 2 minutes (could be configurable)
4. No WebSocket support for real-time updates (uses polling)

## Future Enhancements
1. Implement proof history API endpoint
2. Add WebSocket for real-time status updates
3. Add email notifications for confirmations
4. Add QR code generation for sharing
5. Add proof analytics dashboard
6. Add batch submission capability
7. Add proof revocation feature
8. Add proof template saving
