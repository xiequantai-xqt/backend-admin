const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', authController.logout);

module.exports = router;