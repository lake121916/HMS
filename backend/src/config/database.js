const { Pool } = require('pg');
const path = require('path');

// Support loading from backend/.env or root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();

/**
 * Sanitizes the DATABASE_URL to avoid common issues on cloud hosting (e.g. Render, Railway):
 * - Removes surrounding quotes or leading/trailing whitespace from copy-paste
 * - Removes channel_binding=require which triggers SASL SCRAM client password errors in node-postgres
 * - Replaces sslmode=verify-full with sslmode=require for seamless cloud SSL handshakes
 */
function cleanDatabaseUrl(rawDbUrl) {
  if (!rawDbUrl || typeof rawDbUrl !== 'string') return rawDbUrl;
  let cleaned = rawDbUrl.trim().replace(/^["']|["']$/g, '');
  try {
    const parsed = new URL(cleaned);
    parsed.searchParams.delete('channel_binding');
    if (parsed.searchParams.get('sslmode') === 'verify-full') {
      parsed.searchParams.set('sslmode', 'require');
    }
    return parsed.toString();
  } catch (e) {
    return cleaned
      .replace(/[?&]channel_binding=require/g, '')
      .replace(/([?&])sslmode=verify-full/g, '$1sslmode=require')
      .replace(/\?&/, '?');
  }
}

let pool;
const dbUrl = cleanDatabaseUrl(process.env.DATABASE_URL);

if (dbUrl) {
  // Use connection string (e.g. Neon) with SSL
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 60000,
    // Increase connection timeout to 30s to allow serverless Postgres (Neon) wake up smoothly
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '30000', 10),
  });
} else {
  // Fallback to individual env vars for local development
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'mhs',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '30000', 10),
  });
}

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  // Cloud serverless databases (like Neon) routinely terminate idle TCP sockets (ECONNRESET/ETIMEDOUT).
  // pg.Pool discards closed connections and establishes new ones on demand.
  console.warn('PostgreSQL idle client notice (pool will reconnect on demand):', err.message);
});

module.exports = pool;
