
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { getSupabase, dbGetOne, dbInsert, dbUpdate, dbSelect } from './database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MASTER_PHONE = '8169825915';
const MASTER_PASS  = 'vaibhav-vx';

async function run() {
  try {
    const sb = getSupabase();
    console.log('[PROVISION] Starting master admin setup...');

    // 1. Hash master password
    const hash = bcrypt.hashSync(MASTER_PASS, 10);

    // 2. Check if admin user exists (using email column to store phone number)
    const existingAdmin = await dbGetOne('users', { email: MASTER_PHONE });

    if (existingAdmin) {
      console.log(`[PROVISION] Master admin ${MASTER_PHONE} exists. Updating password and ensuring role: 'admin'...`);
      await dbUpdate('users', existingAdmin.id, { 
        password: hash, 
        role: 'admin',
        name: 'Master Admin'
      });
    } else {
      console.log(`[PROVISION] Creating master admin ${MASTER_PHONE}...`);
      await dbInsert('users', {
        email: MASTER_PHONE, // Store phone in email column
        password: hash,
        role: 'admin',
        name: 'Master Admin',
        location: 'Root'
      });
    }

    // 3. Demote all OTHER admins
    console.log('[PROVISION] Demoting all other administrative accounts to "user" level...');
    const allAdmins = await dbSelect('users', { role: 'admin' });
    
    for (const u of allAdmins) {
      if (u.email !== MASTER_PHONE) {
        console.log(`[PROVISION] Demoting ${u.name} (${u.email || 'no-email'})...`);
        await dbUpdate('users', u.id, { role: 'user' });
      }
    }

    console.log('[PROVISION] ✅ Master admin provisioned. All other accounts demoted.');
    process.exit(0);
  } catch (err) {
    console.error('[PROVISION] ❌ Error:', err.message);
    process.exit(1);
  }
}

run();
