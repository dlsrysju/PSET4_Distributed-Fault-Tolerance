// ========== models/enrollmentModel.js ==========
// MODEL: Enrollment data access

const { Pool } = require('pg');

class EnrollmentModel {
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

  async create(studentId, courseId) {
    const pool = await this.getHealthyPool(false);
    const result = await pool.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING id, enrolled_at',
      [studentId, courseId]
    );
    return result.rows[0];
  }

  async findByStudent(studentId) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(`
      SELECT 
        e.id as enrollment_id,
        c.id as course_id, c.code, c.title, c.description,
        u.first_name as faculty_first_name, u.last_name as faculty_last_name,
        e.enrolled_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.faculty_id = u.id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
    `, [studentId]);
    return result.rows;
  }

  async checkExists(studentId, courseId) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    return result.rows.length > 0;
  }
}

module.exports = EnrollmentModel;