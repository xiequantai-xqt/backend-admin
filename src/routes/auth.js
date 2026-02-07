const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

router.post('/register', userController.register);
router.post('/send-email-code', userController.sendEmailCode);
router.post('/login/email-code', userController.loginWithEmailCode);
router.post('/login/email/code', userController.sendEmailCode);
router.post('/logout', authController.logout);

module.exports = router;
