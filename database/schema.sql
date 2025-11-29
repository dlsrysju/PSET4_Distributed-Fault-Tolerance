-- database/schema.sql
-- Database Setup for Online Enrollment System

-- Create database (run as postgres superuser)
-- CREATE DATABASE enrollment_db;

-- Connect to enrollment_db
-- \c enrollment_db

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    max_students INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER UNIQUE NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    grade VARCHAR(5) NOT NULL,
    remarks TEXT,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_faculty ON courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);

-- Insert sample data
-- Note: Password for all users is 'password123' (hashed with bcrypt)
-- Hash generated with: bcrypt.hash('password123', 10)

-- Sample Faculty Users
INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
('prof.smith@university.edu', '$2b$10$7fsG3RyuktVsIFmVVob4auqX/j9gwPT/NiEr1YPlmDkGfzBYIsYRa', 'faculty', 'John', 'Smith'),
('prof.johnson@university.edu', '$2b$10$7fsG3RyuktVsIFmVVob4auqX/j9gwPT/NiEr1YPlmDkGfzBYIsYRa', 'faculty', 'Sarah', 'Johnson'),
('prof.williams@university.edu', '$2b$10$7fsG3RyuktVsIFmVVob4auqX/j9gwPT/NiEr1YPlmDkGfzBYIsYRa', 'faculty', 'Michael', 'Williams')
ON CONFLICT (email) DO NOTHING;

-- Sample Student Users
INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
('alice@university.edu', '$2b$10$7fsG3RyuktVsIFmVVob4auqX/j9gwPT/NiEr1YPlmDkGfzBYIsYRa', 'student', 'Alice', 'Brown'),
('bob@university.edu', '$2b$10$7fsG3RyuktVsIFmVVob4auqX/j9gwPT/NiEr1YPlmDkGfzBYIsYRa', 'student', 'Bob', 'Davis'),
('carol@university.edu', '$2b$10$7fsG3RyuktVsIFmVVob4auqX/j9gwPT/NiEr1YPlmDkGfzBYIsYRa', 'student', 'Carol', 'Wilson')
ON CONFLICT (email) DO NOTHING;

-- Sample Courses
INSERT INTO courses (code, title, description, faculty_id, status, max_students) VALUES
('CS101', 'Introduction to Computer Science', 'Fundamental concepts of computer science and programming', 1, 'open', 30),
('CS201', 'Data Structures and Algorithms', 'Advanced data structures and algorithm design', 1, 'open', 25),
('MATH101', 'Calculus I', 'Differential and integral calculus', 2, 'open', 40),
('MATH201', 'Linear Algebra', 'Vector spaces, matrices, and linear transformations', 2, 'open', 35),
('PHYS101', 'Physics I', 'Mechanics and thermodynamics', 3, 'open', 30),
('PHYS201', 'Physics II', 'Electricity and magnetism', 3, 'closed', 25)
ON CONFLICT (code) DO NOTHING;

-- Sample Enrollments
INSERT INTO enrollments (student_id, course_id) VALUES
(4, 1), (4, 3), -- Alice enrolled in CS101 and MATH101
(5, 1), (5, 2), -- Bob enrolled in CS101 and CS201
(6, 3), (6, 4)  -- Carol enrolled in MATH101 and MATH201
ON CONFLICT (student_id, course_id) DO NOTHING;

-- Sample Grades
INSERT INTO grades (enrollment_id, grade, remarks, uploaded_by) VALUES
(1, 'A', 'Excellent work throughout the semester', 1),
(2, 'B+', 'Good understanding of concepts', 2),
(3, 'A-', 'Strong performance', 1)
ON CONFLICT (enrollment_id) DO NOTHING;

-- Grant permissions (if using specific database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO enrollment_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO enrollment_user;