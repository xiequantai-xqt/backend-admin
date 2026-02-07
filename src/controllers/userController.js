const User = require('../models/User');
const EmailCode = require('../models/EmailCode');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/mailer');

const EMAIL_CODE_TTL_MINUTES = parseInt(process.env.EMAIL_CODE_TTL_MINUTES || '10', 10);
const EMAIL_CODE_RESEND_SECONDS = parseInt(process.env.EMAIL_CODE_RESEND_SECONDS || '60', 10);

const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const buildLoginResponse = (user, accessToken) => ({
  code: 0,
  data: {
    id: user._id,
    realName: user.realName || user.username,
    roles: user.roles || ['user'],
    username: user.username,
    accessToken,
  },
  error: null,
  message: 'ok',
});

exports.register = async (req, res) => {
  const { username, password, email } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: 'Username and password are required',
        error: 'Missing credentials',
        data: null,
      });
    }

    if (email && !isEmail(email)) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid email format',
        error: 'Invalid email',
        data: null,
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        code: 400,
        message: 'Username already exists',
        error: 'Duplicate username',
        data: null,
      });
    }

    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          code: 400,
          message: 'Email already in use',
          error: 'Duplicate email',
          data: null,
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      password: hashedPassword,
      ...(email ? { email } : {}),
    });
    await user.save();

    res.status(201).json({
      code: 0,
      data: {
        id: user._id,
        username: user.username,
        email: user.email || null,
      },
      error: null,
      message: 'ok',
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Register failed', error: error.message, data: null });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: 'Username and password are required',
        error: 'Missing credentials',
        data: null,
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid username or password',
        error: 'User not found',
        data: null,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid username or password',
        error: 'Password mismatch',
        data: null,
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        code: 500,
        message: 'Server misconfiguration',
        error: 'JWT_SECRET is not set',
        data: null,
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json(buildLoginResponse(user, accessToken));
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: 'Login failed',
      error: error.message,
      data: null,
    });
  }
};

exports.sendEmailCode = async (req, res) => {
  const { email, purpose = 'login' } = req.body;
  try {
    if (!email || !isEmail(email)) {
      return res.status(400).json({
        code: 400,
        message: 'Valid email is required',
        error: 'Invalid email',
        data: null,
      });
    }

    if (purpose !== 'login') {
      return res.status(400).json({
        code: 400,
        message: 'Unsupported code purpose',
        error: 'Invalid purpose',
        data: null,
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      const autoUsername = email.toLowerCase();

      user = await User.create({
        username: autoUsername,
        email: email.toLowerCase(),
        password: hashedPassword,
        roles: ['user'],
      });
    }

    const now = new Date();
    const recentCode = await EmailCode.findOne({
      email: email.toLowerCase(),
      purpose,
      used: false,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    if (recentCode && now - recentCode.createdAt < EMAIL_CODE_RESEND_SECONDS * 1000) {
      return res.status(429).json({
        code: 429,
        message: 'Code already sent, please wait',
        error: 'Too many requests',
        data: null,
      });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(now.getTime() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);

    const subject = 'Your login verification code';
    const text = `Your verification code is ${code}. It expires in ${EMAIL_CODE_TTL_MINUTES} minutes.`;
    const html = `<p>Your verification code is <b>${code}</b>.</p><p>It expires in ${EMAIL_CODE_TTL_MINUTES} minutes.</p>`;

    await sendEmail({ to: email.toLowerCase(), subject, text, html });

    await EmailCode.create({
      email: email.toLowerCase(),
      codeHash,
      purpose,
      expiresAt,
      used: false,
    });

    res.json({
      code: 0,
      data: {
        expiresIn: EMAIL_CODE_TTL_MINUTES * 60,
        ...(process.env.NODE_ENV !== 'production' ? { code } : {}),
      },
      error: null,
      message: 'ok',
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: 'Failed to send email code',
      error: error.message,
      data: null,
    });
  }
};

exports.loginWithEmailCode = async (req, res) => {
  const { email, code } = req.body;
  try {
    if (!email || !isEmail(email) || !code) {
      return res.status(400).json({
        code: 400,
        message: 'Email and code are required',
        error: 'Missing credentials',
        data: null,
      });
    }

    const now = new Date();
    const codeRecord = await EmailCode.findOne({
      email: email.toLowerCase(),
      purpose: 'login',
      used: false,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    if (!codeRecord) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid or expired code',
        error: 'Code not found',
        data: null,
      });
    }

    const isValid = await bcrypt.compare(String(code), codeRecord.codeHash);
    if (!isValid) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid or expired code',
        error: 'Code mismatch',
        data: null,
      });
    }

    codeRecord.used = true;
    await codeRecord.save();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        code: 400,
        message: 'Email not registered',
        error: 'User not found',
        data: null,
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        code: 500,
        message: 'Server misconfiguration',
        error: 'JWT_SECRET is not set',
        data: null,
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json(buildLoginResponse(user, accessToken));
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: 'Login failed',
      error: error.message,
      data: null,
    });
  }
};

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
      return res.status(404).json({ message: 'User not found' });
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
      return res.status(404).json({ message: 'User not found' });
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
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserInfo = (req, res) => {
  res.json({
    code: 0,
    data: {
      id: 0,
      realName: 'Vben',
      roles: ['super'],
      username: 'vben',
    },
    error: null,
    message: 'ok',
  });
};
