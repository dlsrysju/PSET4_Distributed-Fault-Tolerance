// ========== models/courseModel.js ==========
// MODEL: Course data access

const { Pool } = require('pg');

class CourseModel {
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

  async findAll() {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(`
      SELECT 
        c.id, c.code, c.title, c.description, c.status, c.max_students,
        u.first_name as faculty_first_name, u.last_name as faculty_last_name,
        COUNT(e.id) as enrolled_count
      FROM courses c
      LEFT JOIN users u ON c.faculty_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id, u.first_name, u.last_name
      ORDER BY c.code
    `);
    return result.rows;
  }

  async findById(id) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(`
      SELECT 
        c.id, c.code, c.title, c.description, c.status, c.max_students,
        c.faculty_id,
        u.first_name as faculty_first_name, 
        u.last_name as faculty_last_name,
        u.email as faculty_email,
        COUNT(e.id) as enrolled_count
      FROM courses c
      LEFT JOIN users u ON c.faculty_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.id = $1
      GROUP BY c.id, u.first_name, u.last_name, u.email
    `, [id]);
    return result.rows[0];
  }

  async getEnrollmentCount(courseId) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE course_id = $1',
      [courseId]
    );
    return parseInt(result.rows[0].count);
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

module.exports = CourseModel;