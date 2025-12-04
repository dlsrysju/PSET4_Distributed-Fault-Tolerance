// models/profileModel.js
// Data access layer for profile updates and lookups

const { Pool } = require('pg');

class ProfileModel {
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

  async findById(id) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async findByEmail(email) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async updateUser(userId, { email, passwordHash, firstName, lastName }) {
    const pool = await this.getHealthyPool(false);
    const updates = [];
    const values = [];
    let idx = 1;

    if (email) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }
    if (passwordHash) {
      updates.push(`password_hash = $${idx++}`);
      values.push(passwordHash);
    }
    if (firstName !== undefined) {
      updates.push(`first_name = $${idx++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${idx++}`);
      values.push(lastName);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, role, first_name, last_name`,
      values
    );

    return result.rows[0];
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

module.exports = ProfileModel;
