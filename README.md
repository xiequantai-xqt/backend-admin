我来为你详细讲解如何使用 Express 搭建一个后台管理系统。

## 第一步：项目初始化

### 1.1 创建项目目录

```bash
mkdir admin-system
cd admin-system
```

### 1.2 初始化 Node.js 项目

```bash
npm init -y
```

### 1.3 安装基础依赖

```bash
npm install express cors helmet morgan dotenv
```

### 1.4 安装开发依赖

```bash
npm install -D nodemon
```

## 第二步：项目结构搭建

```
admin-system/
├── src/
│   ├── app.js           # Express 应用主文件
│   ├── server.js        # 服务器启动文件
│   ├── config/          # 配置文件
│   ├── routes/          # 路由文件
│   ├── controllers/     # 控制器
│   ├── models/          # 数据模型
│   ├── middleware/      # 中间件
│   ├── utils/           # 工具函数
│   └── public/          # 静态文件
├── .env                 # 环境变量
├── .gitignore
└── package.json
```

## 第三步：基础代码编写

### 3.1 创建环境变量文件 `.env`

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-this
```

### 3.2 修改 `package.json` 添加脚本

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

### 3.3 创建 `src/app.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/public', express.static(path.join(__dirname, 'public')));

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
```

### 3.4 创建 `src/server.js`

```javascript
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});
```

## 第四步：添加数据库支持（以 MongoDB 为例）

### 4.1 安装 MongoDB 相关依赖

```bash
npm install mongoose bcryptjs jsonwebtoken
```

### 4.2 创建数据库配置文件 `src/config/database.js`

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/admin-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 4.3 更新 `.env` 文件

```env
MONGODB_URI=mongodb://localhost:27017/admin-system
```

## 第五步：创建用户认证系统

### 5.1 创建用户模型 `src/models/User.js`

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### 5.2 创建 JWT 工具函数 `src/utils/jwt.js`

```javascript
const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
```

### 5.3 创建认证中间件 `src/middleware/auth.js`

```javascript
const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
  
  req.userId = decoded.userId;
  req.userRole = decoded.role;
  next();
};

const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };
```

### 5.4 创建用户控制器 `src/controllers/authController.js`

```javascript
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 检查用户是否存在
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: '用户名或邮箱已被使用' 
      });
    }
    
    // 创建用户
    const user = new User({
      username,
      email,
      password,
      role: req.body.role || 'user',
    });
    
    await user.save();
    
    // 生成令牌
    const token = generateToken(user._id, user.role);
    
    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: '无效的邮箱或密码' });
    }
    
    // 验证密码
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '无效的邮箱或密码' });
    }
    
    // 检查账户是否激活
    if (!user.isActive) {
      return res.status(403).json({ error: '账户已被禁用' });
    }
    
    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();
    
    // 生成令牌
    const token = generateToken(user._id, user.role);
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 5.5 创建路由 `src/routes/auth.js`

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// 公开路由
router.post('/register', authController.register);
router.post('/login', authController.login);

// 需要认证的路由
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
```

## 第六步：创建管理员功能

### 6.1 创建用户管理控制器 `src/controllers/userController.js`

```javascript
const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    
    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updates = {};
    
    if (role) updates.role = role;
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ message: '用户更新成功', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 6.2 创建管理员路由 `src/routes/admin.js`

```javascript
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
```

## 第七步：更新主应用文件

### 7.1 更新 `src/app.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/public', express.static(path.join(__dirname, 'public')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Admin System API'
  });
});

// 根路由
app.get('/', (req, res) => {
  res.json({
    message: '后台管理系统 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      health: '/health'
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : err.message;
  
  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
```

## 第八步：添加测试和文档

### 8.1 创建 API 文档示例 `docs/api.md`

```markdown
# 后台管理系统 API 文档

## 认证相关

### 注册用户
POST /api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}

### 登录
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}

### 获取用户资料
GET /api/auth/profile
Authorization: Bearer <token>

## 管理员功能

### 获取所有用户
GET /api/admin/users?page=1&limit=10&search=admin
Authorization: Bearer <token>

### 获取系统统计
GET /api/admin/stats
Authorization: Bearer <token>
```

### 8.2 创建 Postman 集合或使用 Swagger

## 第九步：运行和测试

### 9.1 启动 MongoDB（如果本地运行）

```bash
# 使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 或直接安装 MongoDB
```

### 9.2 启动应用

```bash
npm run dev
```

### 9.3 测试 API

使用 Postman 或 curl 测试：

```bash
# 注册管理员用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"admin123","role":"admin"}'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 使用返回的token测试管理员接口
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 第十步：后续扩展建议

### 10.1 添加的功能模块

1. **日志系统** - 记录用户操作
2. **文件上传** - 支持图片、文件上传
3. **权限管理** - RBAC 权限控制
4. **数据备份** - 自动备份数据库
5. **邮件服务** - 发送通知邮件
6. **缓存系统** - Redis 缓存支持

### 10.2 安装更多依赖

```bash
# 文件上传
npm install multer

# 数据验证
npm install joi

# 邮件发送
npm install nodemailer

# Redis
npm install redis ioredis

# 日志
npm install winston

# API 文档
npm install swagger-ui-express swagger-jsdoc
```

### 10.3 安全性增强

1. 添加请求频率限制
2. 实施 CSRF 保护
3. 添加 SQL 注入防护
4. 使用 HTTPS
5. 定期更新依赖

## 项目优化建议

1. **使用 TypeScript** 提高代码质量
2. **添加单元测试** 确保功能稳定
3. **配置 CI/CD** 自动化部署
4. **容器化部署** 使用 Docker
5. **添加监控** 使用 PM2 或类似工具

这样你就有了一个完整的 Express 后台管理系统基础框架，可以根据具体需求继续扩展功能！