#!/usr/bin/env node
/**
 * Test script for username generation with DB double-check.
 *
 * Simulates the race condition / OTT cache problem:
 * - Inserts a fake user with a known username into local DB
 * - Calls generateUniqueUsername with the same name
 * - Verifies it skips the DB-taken username and returns the next free one
 * - Cleans up after
 *
 * Usage:
 *   node backend/scripts/testUsernameGeneration.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

// We test only the DB check part — we mock the OTT call to always return "free"
// so we can verify our DB check catches the duplicate
async function mockCheckUsernameExists(username) {
  // Simulate OTT cache bug: always says username is free
  console.log(`  [OTT mock] checking "${username}" → says FREE (simulating cache bug)`);
  return false;
}

async function checkUsernameExistsInDB(username) {
  const result = await db.query(
    'SELECT 1 FROM users WHERE ott_username = $1 OR biz_ott_username = $1 LIMIT 1',
    [username]
  );
  return result.rows.length > 0;
}

function normalizeAlbanian(str) {
  return str
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/ë/g, 'e').replace(/Ë/g, 'e')
    .replace(/š/g, 's').replace(/Š/g, 's');
}

async function generateUniqueUsername(firstName, lastName) {
  const normFirst = normalizeAlbanian(firstName);
  const normLast  = normalizeAlbanian(lastName).replace(/\s+/g, '');
  const base = `${normFirst[0].toLowerCase()}${normLast.toLowerCase()}`;

  for (let i = 1; i <= 20; i++) {
    const username = `${base}${i}VB`;

    const existsInOtt = await mockCheckUsernameExists(username);
    if (existsInOtt) continue;

    const existsInDb = await checkUsernameExistsInDB(username);
    console.log(`  [DB check] "${username}" → ${existsInDb ? 'TAKEN (skipping)' : 'FREE'}`);
    if (existsInDb) continue;

    return username;
  }
  throw new Error('Unable to generate unique username after 20 attempts');
}

async function main() {
  const TEST_FIRST = 'Test';
  const TEST_LAST  = 'Testuser';
  const base = 'ttestuser';

  console.log('\n=== Username Generation Test ===\n');
  console.log(`Simulating: two users named "${TEST_FIRST} ${TEST_LAST}" registering`);
  console.log(`Expected base: ${base}NVB\n`);

  // Step 1: Insert fake user with ttestuser1VB into DB
  console.log('--- Setup: inserting fake user with "ttestuser1VB" into DB ---');
  const fakeUser = await db.query(`
    INSERT INTO users (first_name, last_name, email, phone, password_hash, ott_username, payment_status)
    VALUES ('Test', 'Testuser', 'test.testuser.unique999@test.com', '+38300000001', 'fakehash', 'ttestuser1VB', 'paid')
    RETURNING id
  `);
  const fakeId = fakeUser.rows[0].id;
  console.log(`  Inserted fake user id=${fakeId} with ott_username="ttestuser1VB"\n`);

  // Step 2: Generate username for same name — should skip ttestuser1VB and return ttestuser2VB
  console.log('--- Test: generating username for same name ---');
  const result = await generateUniqueUsername(TEST_FIRST, TEST_LAST);
  console.log(`\n  Result: "${result}"`);

  if (result === 'ttestuser2VB') {
    console.log('  ✅ PASS — DB check correctly skipped ttestuser1VB and returned ttestuser2VB');
  } else {
    console.log(`  ❌ FAIL — Expected "ttestuser2VB" but got "${result}"`);
  }

  // Step 3: Cleanup
  console.log('\n--- Cleanup: removing fake user ---');
  await db.query('DELETE FROM users WHERE id = $1', [fakeId]);
  console.log('  Fake user removed.\n');

  await db.end();
}

main().catch((err) => {
  console.error('❌ Test error:', err.message);
  process.exit(1);
});
