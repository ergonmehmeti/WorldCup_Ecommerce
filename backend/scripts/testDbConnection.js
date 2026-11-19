#!/usr/bin/env node
/**
 * Test PostgreSQL Connection and Verify Tables
 * 
 * This script verifies the database connection and checks table structure
 * 
 * Usage:
 *   node backend/scripts/testDbConnection.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

async function testConnection() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  PostgreSQL Connection Test                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Test basic connection
    console.log('🔍 Testing database connection...');
    const versionResult = await db.query('SELECT version()');
    console.log('✅ Connected to PostgreSQL');
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}\n`);

    // Check users table structure
    console.log('🔍 Checking users table structure...');
    const columnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log(`✅ Users table has ${columnsResult.rows.length} columns\n`);

    // Check required tables exist
    console.log('🔍 Checking required tables...');
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'payments', 'verification_codes', 'password_reset_tokens', 'agreement_logs')
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'payments', 'verification_codes', 'password_reset_tokens', 'agreement_logs'];
    const foundTables = tablesResult.rows.map(r => r.table_name);
    
    expectedTables.forEach(table => {
      if (foundTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (missing)`);
      }
    });

    // Check for foreign key constraints
    console.log('\n🔍 Checking foreign key constraints on users table...');
    const fkResult = await db.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
    `);
    
    if (fkResult.rows.length > 0) {
      console.log(`✅ Found ${fkResult.rows.length} foreign key(s) referencing users:`);
      fkResult.rows.forEach(fk => {
        console.log(`   ${fk.table_name}.${fk.column_name} → users.${fk.foreign_column_name}`);
      });
    } else {
      console.log('   ℹ️  No foreign keys found (or CASCADE is set)');
    }

    console.log('\n✅ Database connection test completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  }
}

testConnection();
