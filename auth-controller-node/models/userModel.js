// ========== models/userModel.js ==========
// MODEL: User data access and business logic

const { Pool } = require('pg');

class UserModel {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'enrollment_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    this.replicaPool = new Pool({
      host: process.env.DB_REPLICA_HOST || 'localhost',
      port: process.env.DB_REPLICA_PORT || 5433,
      database: process.env.DB_NAME || 'enrollment_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  }

  async getHealthyPool(readOnly = false) {
    try {
      await this.pool.query('SELECT 1');
      return this.pool;
    } catch (error) {
      console.log('Primary database unavailable, switching to replica');
      try {
        await this.replicaPool.query('SELECT 1');
        if (!readOnly) {
          console.warn('Using replica for write operation');
        }
        return this.replicaPool;
      } catch (replicaError) {
        throw new Error('All databases unavailable');
      }
    }
  }

  async findByEmail(email) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(
      'SELECT id, email, password_hash, role, first_name, last_name FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async findById(id) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async create(userData) {
    const { email, passwordHash, role, firstName, lastName } = userData;
    const pool = await this.getHealthyPool(false);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, role, first_name, last_name`,
      [email, passwordHash, role, firstName, lastName]
    );
    return result.rows[0];
  }

  async checkExists(email) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0;
  }

  async checkDatabaseHealth() {
    try {
      await this.getHealthyPool(true);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = UserModel;