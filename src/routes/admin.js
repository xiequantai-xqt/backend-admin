const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 所有管理员路由都需要认证和admin权限
router.use(authMiddleware, adminMiddleware);

// 用户管理
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

// 系统统计
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await require('../models/User').countDocuments();
    const activeUsers = await require('../models/User').countDocuments({ isActive: true });
    const adminCount = await require('../models/User').countDocuments({ role: 'admin' });
    
    res.json({
      totalUsers,
      activeUsers,
      adminCount,
      inactiveUsers: totalUsers - activeUsers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;