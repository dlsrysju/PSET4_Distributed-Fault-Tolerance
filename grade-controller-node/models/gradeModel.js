// ============================================================
// GRADE CONTROLLER NODE (Port 4003) - MVC Structure
// ============================================================

// ========== models/gradeModel.js ==========
// MODEL: Grade data access

const { Pool } = require('pg');

class GradeModel {
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

  async findByStudent(studentId) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(`
      SELECT 
        g.id as grade_id,
        c.id as course_id, c.code as course_code, c.title as course_title,
        g.grade, g.remarks, g.uploaded_at,
        u.first_name as faculty_first_name, u.last_name as faculty_last_name
      FROM grades g
      JOIN enrollments e ON g.enrollment_id = e.id
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON g.uploaded_by = u.id
      WHERE e.student_id = $1
      ORDER BY g.uploaded_at DESC
    `, [studentId]);
    return result.rows;
  }

  async findByEnrollment(enrollmentId) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(
      'SELECT * FROM grades WHERE enrollment_id = $1',
      [enrollmentId]
    );
    return result.rows[0];
  }

  async create(enrollmentId, grade, remarks, uploadedBy) {
    const pool = await this.getHealthyPool(false);
    const result = await pool.query(`
      INSERT INTO grades (enrollment_id, grade, remarks, uploaded_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, grade, remarks, uploaded_at
    `, [enrollmentId, grade, remarks, uploadedBy]);
    return result.rows[0];
  }

  async update(enrollmentId, grade, remarks, uploadedBy) {
    const pool = await this.getHealthyPool(false);
    const result = await pool.query(`
      UPDATE grades 
      SET grade = $1, remarks = $2, uploaded_by = $3, uploaded_at = CURRENT_TIMESTAMP
      WHERE enrollment_id = $4
      RETURNING id, grade, remarks, uploaded_at
    `, [grade, remarks, uploadedBy, enrollmentId]);
    return result.rows[0];
  }

  async getEnrollmentDetails(enrollmentId) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(`
      SELECT e.id, e.student_id, c.faculty_id, c.code as course_code
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = $1
    `, [enrollmentId]);
    return result.rows[0];
  }

  async getFacultyEnrollments(facultyId) {
    const pool = await this.getHealthyPool(true);
    const result = await pool.query(`
      SELECT 
        e.id as enrollment_id,
        c.id as course_id, c.code as course_code, c.title as course_title,
        u.id as student_id, u.first_name as student_first_name, 
        u.last_name as student_last_name, u.email as student_email,
        e.enrolled_at,
        g.grade, g.remarks, g.uploaded_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.student_id = u.id
      LEFT JOIN grades g ON e.id = g.enrollment_id
      WHERE c.faculty_id = $1
      ORDER BY c.code, u.last_name, u.first_name
    `, [facultyId]);
    return result.rows;
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

module.exports = GradeModel;