const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Production-ready settings
  max: 50, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Wait 2s before timing out
});

// Test connection once on startup
pool.query('SELECT 1').then(() => {
  console.log('✅ Connected to PostgreSQL database');
}).catch((err) => {
  console.error('❌ PostgreSQL connection error:', err);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
