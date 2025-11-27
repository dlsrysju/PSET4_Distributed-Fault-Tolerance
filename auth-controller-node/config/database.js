// ========== config/database.js ==========
// DATABASE CONFIG: Connection settings

const { Pool } = require('pg');

const createPool = (config = {}) => {
  return new Pool({
    host: config.host || process.env.DB_HOST || 'localhost',
    port: config.port || process.env.DB_PORT || 5432,
    database: config.database || process.env.DB_NAME || 'enrollment_db',
    user: config.user || process.env.DB_USER || 'postgres',
    password: config.password || process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

module.exports = { createPool };