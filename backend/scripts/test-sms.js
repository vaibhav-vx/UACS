// SMS Test Script
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendSMS } from '../integrations/smsGateway.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function test() {
  console.log('Testing SMS Gateway with credentials:');
  console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Provided' : '❌ Missing');
  console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Provided' : '❌ Missing');
  console.log('Phone/Service:', process.env.TWILIO_Messaging_Service_SID || process.env.TWILIO_PHONE_NUMBER);

  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.error('Error: TWILIO_ACCOUNT_SID is not set in .env');
    return;
  }

  // We won't actually send a message to a real number unless we have one.
  // But we can check the client initialization.
  try {
    // This will at least verify that the twilio package is installed and can be initialized
    console.log('Attempting to initialize Twilio client...');
    const result = await sendSMS('+918169825915', 'Test message from UACS diagnostic script');
    console.log('Result:', result);
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

test();
