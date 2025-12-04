// view-node/server.js
require('dotenv').config({ override: true });   

const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const grpc = require('@grpc/grpc-js');

// gRPC clients
const authClient = require('./grpcClients/authClient');
const courseClient = require('./grpcClients/courseClient');
const gradeClient = require('./grpcClients/gradeClient');
const profileClient = require('./grpcClients/profileClient');
const accountClient = require('./grpcClients/accountClient');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const HEALTH_TARGETS = {
  auth:   process.env.AUTH_HTTP_HEALTH || 'http://localhost:4001/health',
  course: process.env.COURSE_HTTP_HEALTH || 'http://localhost:4002/health',
  grade:  process.env.GRADE_HTTP_HEALTH || 'http://localhost:4003/health',
  profile: process.env.PROFILE_HTTP_HEALTH || 'http://localhost:4004/health',
  account: process.env.ACCOUNT_HTTP_HEALTH || 'http://localhost:4006/health',
};

app.get('/api/health/:service', async (req, res) => {
  const service = req.params.service;

  const targetUrl = HEALTH_TARGETS[service];
  if (!targetUrl) {
    return res.status(404).json({ success: false, error: 'Unknown service' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const resp = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      return res.json({ success: false, error: `HTTP ${resp.status}` });
    }

    const data = await resp.json();
    // Your backend /health already returns { success: true/false, ... }
    return res.json({ success: !!data.success });
  } catch (err) {
    console.error(`Health check error for ${service}:`, err.message);
    return res.json({ success: false, error: 'unreachable' });
  }
});

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

// ===== ACCOUNT ROUTE =====
app.post('/api/account/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
    });
  }

  accountClient.CreateStudent(
    { email, password, firstName, lastName },
    (err, response) => {
      if (err) {
        console.error('gRPC CreateStudent error:', err);
        if (err.code === grpc.status.ALREADY_EXISTS) {
          return res.status(409).json({
            success: false,
            error: 'User already exists',
          });
        }
        if (err.code === grpc.status.INVALID_ARGUMENT) {
          return res.status(400).json({
            success: false,
            error: err.details || 'Invalid account data',
          });
        }
        return res.status(500).json({
          success: false,
          error: 'Failed to create account',
        });
      }

      if (response.success === false) {
        return res.status(400).json({
          success: false,
          error: response.error || 'Failed to create account',
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          user: {
            id: response.userId,
            email: response.email,
            role: response.role,
            firstName: response.firstName,
            lastName: response.lastName,
          },
          token: response.token,
        },
      });
    }
  );
});

// ===== PROFILE ROUTES =====
// `${CONTROLLERS.profile}/api/profile/me`
app.get('/api/profile/me', (req, res) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  authClient.ValidateToken({ token }, (authErr, authResp) => {
    if (authErr || !authResp.valid) {
      console.error('ValidateToken error (profile/me):', authErr || 'invalid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    profileClient.GetProfile(
      { userId: authResp.userId },
      (err, response) => {
        if (err) {
          console.error('gRPC GetProfile error:', err);
          if (err.code === grpc.status.NOT_FOUND) {
            return res.status(404).json({
              success: false,
              error: 'User not found',
            });
          }
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
          });
        }

        return res.json({
          success: response.success !== false,
          data: { user: response.user },
          error: response.error || null,
        });
      }
    );
  });
});

// `${CONTROLLERS.profile}/api/profile`
app.put('/api/profile', (req, res) => {
  const token = getBearerToken(req);
  const { email, password, firstName, lastName } = req.body || {};

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  authClient.ValidateToken({ token }, (authErr, authResp) => {
    if (authErr || !authResp.valid) {
      console.error('ValidateToken error (profile/update):', authErr || 'invalid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    profileClient.UpdateProfile(
      { userId: authResp.userId, email, password, firstName, lastName },
      (err, response) => {
        if (err) {
          console.error('gRPC UpdateProfile error:', err);
          if (err.code === grpc.status.ALREADY_EXISTS) {
            return res.status(409).json({
              success: false,
              error: 'Email already in use',
            });
          }
          if (err.code === grpc.status.INVALID_ARGUMENT) {
            return res.status(400).json({
              success: false,
              error: err.details || 'Invalid profile data',
            });
          }
          if (err.code === grpc.status.UNAUTHENTICATED) {
            return res.status(401).json({
              success: false,
              error: 'Unauthorized',
            });
          }
          return res.status(500).json({
            success: false,
            error: 'Failed to update profile',
          });
        }

        if (response.success === false) {
          return res.status(400).json({
            success: false,
            error: response.error || 'Failed to update profile',
          });
        }

        return res.json({
          success: true,
          data: {
            user: response.user,
            token: response.token,
          },
        });
      }
    );
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
