// routes/profileRoutes.js
// Routes for profile retrieval and updates

const express = require('express');
const ProfileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateUpdateProfile } = require('../validators/profile-Validators');

const router = express.Router();
const profileController = new ProfileController();

router.get('/me', authMiddleware, (req, res) => profileController.getProfile(req, res));
router.put('/', authMiddleware, validateUpdateProfile, (req, res) => profileController.updateProfile(req, res));

module.exports = router;
