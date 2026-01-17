const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

// 优化后的完整 authController.js
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 检查用户是否存在
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        code: 400,
        message: '用户名或邮箱已被使用'
      });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password,
      role: req.body.role || 'user',
    });
    await user.save();

    // 生成JWT token
    const token = generateToken(user._id, user.role);
    
    res.status(201).json({
      code: 0,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      message: '注册成功'
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '无效的邮箱或密码'
      });
    }

    // 验证密码
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        code: 401,
        message: '无效的邮箱或密码'
      });
    }

    // 生成JWT token
    const token = generateToken(user._id, user.role);
    
    res.json({
      code: 0,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      message: '登录成功'
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    res.json({
      code: 0,
      data: {
        id: user._id,
        realName: user.username,
        roles: [user.role],
        username: user.username
      },
      message: 'ok'
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
};

// 优化后的 logout 接口 (完全符合要求的响应格式)
exports.logout = (req, res) => {
  // 服务端不处理 token 有效期（实际项目中应实现 token 黑名单）
  // 仅返回成功响应，前端负责清除 token
  res.json({
    code: 0,
    data: null,
    error: null,
    message: '退出成功'
  });
};