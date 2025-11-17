/**
 * Simple Persona Integration Test
 * 
 * This script tests Persona service methods directly without requiring
 * the full server to be running.
 * 
 * Usage: npx ts-node -r dotenv/config src/scripts/test-persona-simple.ts dotenv_config_path=.env
 */

import { personaService } from '../services/persona.service';
import pool from '../config/database';
import crypto from 'crypto';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}`);
  if (error) {
    console.log(`  Error: ${error}`);
  }
  if (details) {
    console.log(`  Details:`, JSON.stringify(details, null, 2));
  }
}

async function runTests() {
  console.log('\n=== Persona Service Integration Tests ===\n');
  console.log('Persona Environment:', process.env.PERSONA_ENVIRONMENT || 'sandbox');
  console.log('Persona API Key:', process.env.PERSONA_API_KEY ? 'Set' : 'Not set');
  console.log('Persona Template ID:', process.env.PERSONA_TEMPLATE_ID || 'Not set');
  console.log('\n');

  try {
    // Test 1: Create a test user in database
    console.log('Setting up test user...');
    const testUserId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id RETURNING id`,
      [testUserId, 'test-persona@example.com', 'dummy_hash']
    );
    console.log(`Test user ID: ${testUserId}\n`);

    // Test 2: Create inquiry
    console.log('Running tests...\n');
    let inquiryId: string | null = null;
    try {
      const inquiry = await personaService.createInquiry(testUserId, 'test-ref-001');
      if (inquiry.inquiryId && inquiry.sessionToken) {
        inquiryId = inquiry.inquiryId;
        logTest('Create inquiry', true, undefined, {
          inquiryId: inquiry.inquiryId,
          hasSessionToken: !!inquiry.sessionToken,
        });
      } else {
        logTest('Create inquiry', false, 'Invalid response format');
      }
    } catch (error: any) {
      logTest('Create inquiry', false, error.message);
    }

    // Test 3: Verify database record
    if (inquiryId) {
      try {
        const result = await pool.query(
          'SELECT * FROM persona_verifications WHERE inquiry_id = $1',
          [inquiryId]
        );
        if (result.rows.length > 0) {
          logTest('Database record creation', true, undefined, {
            inquiryId: result.rows[0].inquiry_id,
            userId: result.rows[0].user_id,
          });
        } else {
          logTest('Database record creation', false, 'No record found');
        }
      } catch (error: any) {
        logTest('Database record creation', false, error.message);
      }
    }

    // Test 4: Get verification status (should be null initially)
    try {
      const status = await personaService.getVerificationStatus(testUserId);
      if (status && !status.ssnVerified && !status.selfieVerified && !status.documentVerified) {
        logTest('Get verification status (initial)', true, undefined, status);
      } else if (status === null) {
        logTest('Get verification status (initial)', false, 'Expected initial status but got null');
      } else {
        logTest('Get verification status (initial)', true, undefined, status);
      }
    } catch (error: any) {
      logTest('Get verification status (initial)', false, error.message);
    }

    // Test 5: Simulate webhook event
    if (inquiryId) {
      try {
        const webhookEvent = {
          data: {
            type: 'event' as const,
            id: 'evt_test_123',
            attributes: {
              name: 'inquiry.completed',
              payload: {
                data: {
                  type: 'inquiry' as const,
                  id: inquiryId,
                  attributes: {
                    status: 'completed' as const,
                    'reference-id': 'test-ref-001',
                    'created-at': new Date().toISOString(),
                    'completed-at': new Date().toISOString(),
                  },
                },
                included: [
                  {
                    type: 'verification/government-id' as const,
                    id: 'ver_doc_123',
                    attributes: {
                      status: 'passed' as const,
                      'created-at': new Date().toISOString(),
                      'completed-at': new Date().toISOString(),
                    },
                  },
                  {
                    type: 'verification/selfie' as const,
                    id: 'ver_selfie_123',
                    attributes: {
                      status: 'passed' as const,
                      'created-at': new Date().toISOString(),
                      'completed-at': new Date().toISOString(),
                    },
                  },
                  {
                    type: 'verification/database' as const,
                    id: 'ver_db_123',
                    attributes: {
                      status: 'passed' as const,
                      'created-at': new Date().toISOString(),
                      'completed-at': new Date().toISOString(),
                    },
                  },
                ],
              },
            },
          },
        };

        await personaService.handleWebhookEvent(webhookEvent);
        logTest('Handle webhook event', true);

        // Wait a moment for database update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify database update
        const result = await pool.query(
          'SELECT * FROM persona_verifications WHERE inquiry_id = $1',
          [inquiryId]
        );

        if (result.rows.length > 0) {
          const record = result.rows[0];
          const allVerified = record.ssn_verified && record.selfie_verified && record.document_verified;
          if (allVerified && record.completed_at) {
            logTest('Database update after webhook', true, undefined, {
              ssnVerified: record.ssn_verified,
              selfieVerified: record.selfie_verified,
              documentVerified: record.document_verified,
              completedAt: record.completed_at,
            });
          } else {
            logTest('Database update after webhook', false, 'Verification flags not updated', {
              ssnVerified: record.ssn_verified,
              selfieVerified: record.selfie_verified,
              documentVerified: record.document_verified,
            });
          }
        } else {
          logTest('Database update after webhook', false, 'No record found');
        }

        // Test 6: Get verification status after webhook
        const statusAfter = await personaService.getVerificationStatus(testUserId);
        if (statusAfter && statusAfter.ssnVerified && statusAfter.selfieVerified && statusAfter.documentVerified) {
          logTest('Get verification status (after webhook)', true, undefined, statusAfter);
        } else {
          logTest('Get verification status (after webhook)', false, 'Status not updated correctly', statusAfter);
        }
      } catch (error: any) {
        logTest('Handle webhook event', false, error.message);
      }
    }

    // Test 7: Webhook signature verification
    try {
      const testPayload = JSON.stringify({ test: 'data' });
      const testSignature = crypto
        .createHmac('sha256', process.env.PERSONA_WEBHOOK_SECRET || '')
        .update(testPayload)
        .digest('hex');

      personaService.verifyWebhookSignature(
        Buffer.from(testPayload),
        testSignature
      );

      logTest('Webhook signature verification (valid)', true, undefined, {
        verified: true,
      });
    } catch (error: any) {
      logTest('Webhook signature verification (valid)', false, error.message);
    }

    // Test 8: Invalid webhook signature
    try {
      const testPayload = JSON.stringify({ test: 'data' });
      personaService.verifyWebhookSignature(
        Buffer.from(testPayload),
        'invalid_signature'
      );
      logTest('Webhook signature verification (invalid)', false, 'Expected error but succeeded');
    } catch (error: any) {
      if (error.message.includes('Invalid webhook signature')) {
        logTest('Webhook signature verification (invalid)', true, undefined, {
          expectedError: 'Invalid signature rejected',
        });
      } else {
        logTest('Webhook signature verification (invalid)', false, `Unexpected error: ${error.message}`);
      }
    }

    // Print summary
    console.log('\n=== Test Summary ===\n');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`Total: ${total}`);
    console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
    console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('Failed tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
      console.log('');
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n\x1b[31mTest execution failed:\x1b[0m', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
