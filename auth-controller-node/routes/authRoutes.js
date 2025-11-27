// ========== routes/authRoutes.js ==========
// ROUTES: Define API endpoints

const express = require('express');
const AuthController = require('../controllers/authController');

const router = express.Router();
const authController = new AuthController();

// Bind controller methods to routes
router.post('/login', (req, res) => authController.login(req, res));
router.post('/register', (req, res) => authController.register(req, res));
router.post('/verify', (req, res) => authController.verify(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

module.exports = router;