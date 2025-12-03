// view-node/server.js
require('dotenv').config();   

const express = require('express');
const path = require('path');
const cors = require('cors');

// gRPC clients
const authClient = require('./grpcClients/authClient');
const courseClient = require('./grpcClients/courseClient');
const gradeClient = require('./grpcClients/gradeClient');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: extract Bearer token
function getBearerToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const parts = authHeader.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
}

// ===== AUTH ROUTES =====
// matches frontend: `${CONTROLLERS.auth}/api/auth/login`
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required' ,
    });
  }

  // Adjust fields here to match your auth.proto
  authClient.Login({ email, password }, (err, response) => {
    if (err) {
      console.error('gRPC Login error:', err);
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable',
      });
    }

    // ASSUMPTION:
    // LoginResponse has: bool success, string error, string token, User user
    if (!response.success) {
      return res.status(401).json({
        success: false,
        error: response.error || 'Invalid credentials view node',
      });
    }

    return res.json({
      success: true,
      data: {
        token: response.token,
        user: response.user, // { id, email, first_name, last_name, role, ... }
      },
    });
  });
});

// ===== COURSE ROUTES =====
// matches: `${CONTROLLERS.course}/api/courses`
app.get('/api/courses', (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  authClient.ValidateToken({ token }, (authErr, authResp) => {
    if (authErr || !authResp.valid) {
      console.error('ValidateToken error (courses):', authErr || 'invalid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // no params needed, but you can pass role if your proto allows
    courseClient.ListOpenCourses({}, (err, response) => {
      if (err) {
        console.error('gRPC ListOpenCourses error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch courses',
        });
      }

      return res.json({
        success: true,
        data: response.courses || [],
      });
    });
  });
});

// matches: `${CONTROLLERS.course}/api/enrollments` (POST)
app.post('/api/enrollments', (req, res) => {
  const token = getBearerToken(req);
  const { courseId } = req.body || {};

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }
  if (!courseId) {
    return res.status(400).json({ success: false, error: 'courseId is required' });
  }

  authClient.ValidateToken({ token }, (authErr, authResp) => {
    if (authErr || !authResp.valid) {
      console.error('ValidateToken error (enroll):', authErr || 'invalid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    courseClient.Enroll(
      { userId: authResp.userId, courseId },
      (err, response) => {
        if (err) {
          console.error('gRPC Enroll error:', err);
          return res.status(500).json({
            success: false,
            error: 'Already enrolled in this course',
          });
        }

        return res.json({
          success: true,
          data: response, // shape up to you; frontend mostly needs success
        });
      }
    );
  });
});

// matches: `${CONTROLLERS.course}/api/enrollments/my` (GET)
app.get('/api/enrollments/my', (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  authClient.ValidateToken({ token }, (authErr, authResp) => {
    if (authErr || !authResp.valid) {
      console.error('ValidateToken error (my enrollments):', authErr || 'invalid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // ASSUMPTION: you have a gRPC method like ListEnrollmentsByStudent
    courseClient.ListEnrollmentsByStudent(
      { userId: authResp.userId },
      (err, response) => {
        if (err) {
          console.error('gRPC ListEnrollmentsByStudent error:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch enrollments',
          });
        }

        console.log("gRPC ListEnrollmentsByStudent fetched enrollments:", response.enrollments);

        return res.json({
          success: true,
          data: response.enrollments || [],
        });
      }
    );
  });
});

// ===== GRADE ROUTES =====
// matches: student: `${CONTROLLERS.grade}/api/grades/my`
//          faculty: `${CONTROLLERS.grade}/api/grades/enrollments`
app.get('/api/grades/my', (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  authClient.ValidateToken({ token }, (authErr, authResp) => {
    if (authErr || !authResp.valid) {
      console.error('ValidateToken error (grades/my):', authErr || 'invalid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    gradeClient.ListGrades(
      { userId: authResp.userId },
      (err, response) => {
        if (err) {
          console.error('gRPC ListGrades error:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch grades',
          });
        }

        return res.json({
          success: true,
          data: response.grades || [],
        });
      }
    );
  });
});

// for faculty: `/api/grades/enrollments`
app.get('/api/grades/enrollments', (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  authClient.ValidateToken({ token }, (authErr, authResp) => {
    if (authErr || !authResp.valid) {
      console.error('ValidateToken error (grades/enrollments):', authErr || 'invalid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // ASSUMPTION: facultyId is authResp.userId
    gradeClient.ListEnrollmentsWithGrades(
      { facultyId: authResp.userId },
      (err, response) => {
        if (err) {
          console.error('gRPC ListEnrollmentsWithGrades error:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch enrollments with grades',
          });
        }

        return res.json({
          success: true,
          data: response.enrollments || [],
        });
      }
    );
  });
});

// matches: `${CONTROLLERS.grade}/api/grades/upload` (POST)
app.post('/api/grades/upload', (req, res) => {
  const token = getBearerToken(req);
  const { enrollmentId, grade, remarks } = req.body || {};

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  // Optional: quick sanity check before calling gRPC
  if (!enrollmentId || !grade) {
    return res.status(400).json({
      success: false,
      error: 'enrollmentId and grade are required',
    });
  }

  authClient.ValidateToken({ token }, (authErr, authResp) => {
    if (authErr || !authResp.valid) {
      console.error('ValidateToken error (grades/upload):', authErr || 'invalid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const facultyId = authResp.userId;  // from JWT payload

    gradeClient.UploadGrade(
      {
        facultyId: String(facultyId),
        enrollmentId: String(enrollmentId),
        grade,
        remarks: remarks || '',
      },
      (err, response) => {
        if (err) {
          console.error('gRPC UploadGrade error:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload grade',
          });
        }

        return res.json({
          success: true,
          data: response.record || response,
        });
      }
    );
  });
});


// ===== SPA catch-all =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log('VIEW Node (MVC + gRPC Gateway)');
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
  console.log('========================================');
});