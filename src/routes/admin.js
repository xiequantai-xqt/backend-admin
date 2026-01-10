const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 所有管理员路由都需要认证和admin权限
router.use(authMiddleware, adminMiddleware);

// 用户管理 - 添加安全检查
const handleUserRoute = (routeName, handler) => {
  // 添加更详细的错误日志，方便调试
  if (typeof handler !== 'function') {
    console.error(`[ADMIN ROUTE ERROR] ${routeName} handler is not a function. 
      Please check if userController.${routeName} is properly defined in controllers/userController.js`);
    return (req, res) => {
      res.status(500).json({ 
        error: `Internal server error: ${routeName} handler missing. 
        Check controllers/userController.js for ${routeName} function` 
      });
    };
  }
  return handler;
};

// 用户管理
router.get('/users', handleUserRoute('getAllUsers', userController.getAllUsers));
router.get('/users/:id', handleUserRoute('getUserById', userController.getUserById));
router.put('/users/:id', handleUserRoute('updateUser', userController.updateUser));
router.delete('/users/:id', handleUserRoute('deleteUser', userController.deleteUser));

// 系统统计
router.get('/stats', async (req, res) => {
  try {
    const User = require('../models/User');
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    res.json({
      totalUsers,
      activeUsers,
      adminCount,
      inactiveUsers: totalUsers - activeUsers,
    });
  } catch (error) {
    console.error(`[STATS ERROR] ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;