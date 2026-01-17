const express = require('express');
const router = express.Router();

// 引入控制器
const userController = require('../controllers/userController');

// 定义 /api/user/info 路由
router.get('/info', userController.getUserInfo);

module.exports = router;