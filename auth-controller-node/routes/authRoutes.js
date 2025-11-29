// ========== routes/authRoutes.js ==========
// ROUTES: Define API endpoints

const express = require('express');
const AuthController = require('../controllers/authController');
const { validateLogin, validateRegister } = require('../validators/auth-Validators');

const router = express.Router();
const authController = new AuthController();

// Bind controller methods to routes with validation
router.post('/login', validateLogin, (req, res) => authController.login(req, res));
router.post('/register', validateRegister, (req, res) => authController.register(req, res));
router.post('/verify', (req, res) => authController.verify(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

module.exports = router;