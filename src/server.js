const app = require('./app');

const PORT = process.env.PORT || 3000;
const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
})
