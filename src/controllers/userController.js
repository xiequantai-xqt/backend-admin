const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { username, password } = req.body;
  try {
    // 检查用户名是否已存在
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 创建新用户
    user = new User({
      username,
      password: hashedPassword,
    });
    await user.save();
    res.status(201).json({ message: '注册成功' });
  } catch (error) {
    res.status(500).json({ message: '注册失败', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    // 查找用户（这里假设数据库中存储了原始密码，实际项目应避免返回密码）
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({
        code: 400,
        message: '用户名或密码错误',
        error: 'User not found',
        data: null
      });
    }

    // 验证密码（实际项目应使用 bcrypt.compare）
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        code: 400,
        message: '用户名或密码错误',
        error: 'Password mismatch',
        data: null
      });
    }

    // 生成 JWT Token
    const accessToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 按照您要求的格式返回数据
    res.json({
      code: 0,
      data: {
        id: 0, // 按照示例固定为0（实际项目应使用用户ID）
        password: user.password, // 注意：实际项目不应返回原始密码！
        realName: user.realName || 'Vben', // 示例值
        roles: user.roles || ['super'], // 示例值
        username: user.username,
        accessToken: accessToken
      },
      error: null,
      message: "ok"
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '登录失败',
      error: error.message,
      data: null
    });
  }
};

// 新增的用户管理函数
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户未找到' });
    }
    res.json({ message: '用户已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getUserInfo = (req, res) => {
    // 返回指定的响应数据
    res.json({
        "code": 0,
        "data": {
            "id": 0,
            "realName": "Vben",
            "roles": [
                "super"
            ],
            "username": "vben"
        },
        "error": null,
        "message": "ok"
    });
};