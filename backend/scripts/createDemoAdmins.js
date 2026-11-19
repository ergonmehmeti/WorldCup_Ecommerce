/**
 * Create demo admin accounts for operator training session.
 *
 * Creates two accounts:
 *   1. demo.operator@alfa.com  — role: admin_operator  (limited — what trainees will have)
 *   2. demo.admin@alfa.com     — role: admin           (full access — what you use)
 *
 * Both: password = 12345678
 *
 * Usage:
 *   cd backend
 *   node scripts/createDemoAdmins.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const PASSWORD = '12345678';

const ACCOUNTS = [
  {
    label: 'Admin Operator (limited)',
    first_name: 'Demo',
    last_name: 'Operator',
    email: 'demo.operator@alfa.com',
    phone: 'N/A',
    role: 'admin_operator',
  },
  {
    label: 'Full Admin',
    first_name: 'Demo',
    last_name: 'Admin',
    email: 'demo.admin@alfa.com',
    phone: 'N/A',
    role: 'admin',
  },
];

async function upsert({ first_name, last_name, email, phone, role }) {
  const pw = await bcrypt.hash(PASSWORD, 12);
  const existing = await db.query('SELECT id, role FROM users WHERE email = $1', [email]);

  if (existing.rowCount > 0) {
    const { id } = existing.rows[0];
    await db.query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, password_hash=$4, role=$5, email_verified=TRUE WHERE id=$6`,
      [first_name, last_name, phone, pw, role, id]
    );
    return { id, created: false };
  } else {
    const res = await db.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, email_verified, role)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6) RETURNING id`,
      [first_name, last_name, email, phone, pw, role]
    );
    return { id: res.rows[0].id, created: true };
  }
}

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Creating demo admin accounts for training session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const acc of ACCOUNTS) {
    const { id, created } = await upsert(acc);
    const icon = created ? '✅ Created' : 'ℹ️  Updated';
    console.log(`${icon}  #${id}  ${acc.email}  (${acc.label})`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Password for both: 12345678');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('  demo.operator@alfa.com  →  admin_operator  (limited access)');
  console.log('  demo.admin@alfa.com     →  admin           (full access)\n');
  console.log('  Use demo.operator to SHOW what operators see (no create/delete/promote buttons).');
  console.log('  Use demo.admin to SHOW full admin capabilities.\n');

  await db.pool.end();
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
