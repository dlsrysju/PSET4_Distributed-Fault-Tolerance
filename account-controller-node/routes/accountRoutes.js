// routes/accountRoutes.js
const express = require('express');
const AccountController = require('../controllers/accountController');
const { validateCreateStudent } = require('../validators/account-Validators');

const router = express.Router();
const accountController = new AccountController();

router.post('/register', validateCreateStudent, (req, res) => accountController.createStudent(req, res));

module.exports = router;
