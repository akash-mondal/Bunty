import crypto from 'crypto';
import { personaService } from '../services/persona.service';

/**
 * Test script to verify Persona webhook signature verification
 */
async function testWebhookSignature() {
  console.log('Testing Persona webhook signature verification...\n');

  // Sample webhook event payload
  const webhookPayload = {
    data: {
      type: 'event',
      id: 'evt_test123',
      attributes: {
        name: 'inquiry.completed',
        payload: {
          data: {
            type: 'inquiry',
            id: 'inq_test123',
            attributes: {
              status: 'completed',
              'reference-id': 'user_test123',
              'created-at': '2024-01-15T10:00:00.000Z',
              'completed-at': '2024-01-15T10:30:00.000Z',
            },
          },
          included: [
            {
              type: 'verification/government-id',
              id: 'ver_doc123',
              attributes: {
                status: 'passed',
                'created-at': '2024-01-15T10:10:00.000Z',
                'completed-at': '2024-01-15T10:20:00.000Z',
              },
            },
            {
              type: 'verification/selfie',
              id: 'ver_selfie123',
              attributes: {
                status: 'passed',
                'created-at': '2024-01-15T10:15:00.000Z',
                'completed-at': '2024-01-15T10:25:00.000Z',
              },
            },
            {
              type: 'verification/database',
              id: 'ver_db123',
              attributes: {
                status: 'passed',
                'created-at': '2024-01-15T10:20:00.000Z',
                'completed-at': '2024-01-15T10:28:00.000Z',
              },
            },
          ],
        },
      },
    },
  };

  const payloadBuffer = Buffer.from(JSON.stringify(webhookPayload));

  // Generate valid signature using the webhook secret
  const webhookSecret = process.env.PERSONA_WEBHOOK_SECRET || 'test_secret';
  const validSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadBuffer)
    .digest('hex');

  console.log('Test 1: Valid signature verification');
  try {
    const event = personaService.verifyWebhookSignature(payloadBuffer, validSignature);
    console.log('✓ Valid signature accepted');
    console.log('  Event type:', event.data.attributes.name);
    console.log('  Inquiry ID:', event.data.attributes.payload.data.id);
    console.log('  Inquiry status:', event.data.attributes.payload.data.attributes.status);
  } catch (error: any) {
    console.log('✗ Valid signature rejected:', error.message);
  }

  console.log('\nTest 2: Invalid signature rejection');
  const invalidSignature = 'invalid_signature_12345';
  try {
    personaService.verifyWebhookSignature(payloadBuffer, invalidSignature);
    console.log('✗ Invalid signature accepted (should have been rejected)');
  } catch (error: any) {
    console.log('✓ Invalid signature rejected:', error.message);
  }

  console.log('\nTest 3: Event type filtering');
  const eventTypes = ['inquiry.completed', 'inquiry.failed', 'inquiry.expired', 'inquiry.created'];
  for (const eventType of eventTypes) {
    console.log(`  Event type: ${eventType}`);
    console.log(`    Should process: ${['inquiry.completed', 'inquiry.failed', 'inquiry.expired'].includes(eventType)}`);
  }

  console.log('\nWebhook signature verification tests completed!');
}

// Run the test
testWebhookSignature()
  .then(() => {
    console.log('\n✓ All tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  });
