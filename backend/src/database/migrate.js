/**
 * Database Migration Runner
 * Professional migration system for production
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const db = require('../config/db');

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  /**
   * Ensure schema_migrations table exists
   */
  async ensureMigrationsTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id              SERIAL PRIMARY KEY,
        version         VARCHAR(50) UNIQUE NOT NULL,
        description     TEXT,
        executed_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations() {
    const result = await db.query('SELECT version FROM schema_migrations ORDER BY version');
    return result.rows.map(row => row.version);
  }

  /**
   * Get pending migration files
   */
  getPendingMigrations(executedVersions) {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.filter(file => {
      const version = file.split('_')[0];
      return !executedVersions.includes(version);
    });
  }

  /**
   * Run a single migration
   */
  async runMigration(filename) {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const version = filename.split('_')[0];
    const description = filename.replace('.sql', '').replace(/^\d+_/, '').replace(/_/g, ' ');

    console.log(`\n🔄 Running migration: ${filename}`);

    try {
      // Run the migration SQL
      await db.query(sql);
      // Record the migration as executed (ON CONFLICT handles self-inserting migrations)
      await db.query(
        'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
        [version, description]
      );
      console.log(`✅ Migration ${version} completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Migration ${version} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    console.log('\n📦 Starting database migration...\n');

    try {
      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Get executed migrations
      const executedVersions = await this.getExecutedMigrations();
      console.log(`✓ Found ${executedVersions.length} executed migration(s)`);

      // Get pending migrations
      const pendingMigrations = this.getPendingMigrations(executedVersions);

      if (pendingMigrations.length === 0) {
        console.log('\n✨ Database is up to date. No migrations to run.\n');
        return;
      }

      console.log(`\n📝 Found ${pendingMigrations.length} pending migration(s):\n`);
      pendingMigrations.forEach(m => console.log(`   - ${m}`));

      // Run each pending migration
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }

      console.log('\n✨ All migrations completed successfully!\n');
    } catch (error) {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    }
  }

  /**
   * Show migration status
   */
  async status() {
    console.log('\n📊 Migration Status\n');

    await this.ensureMigrationsTable();
    const executedVersions = await this.getExecutedMigrations();
    const allFiles = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('Executed Migrations:');
    if (executedVersions.length === 0) {
      console.log('  (none)');
    } else {
      executedVersions.forEach(v => {
        const file = allFiles.find(f => f.startsWith(v));
        console.log(`  ✅ ${file || v}`);
      });
    }

    const pending = this.getPendingMigrations(executedVersions);
    console.log('\nPending Migrations:');
    if (pending.length === 0) {
      console.log('  (none)');
    } else {
      pending.forEach(m => console.log(`  ⏳ ${m}`));
    }

    console.log('');
  }
}

// CLI runner
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2] || 'migrate';

  if (command === 'status') {
    runner.status()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    runner.migrate()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = MigrationRunner;
