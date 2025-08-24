const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { models } = require('mongoose');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

module.exports = router;