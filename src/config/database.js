const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 从环境变量获取 MongoDB 连接字符串，如果没有则使用默认值
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/backend-admin';
    
    // 连接 MongoDB - 修正了选项拼写
    const conn = await mongoose.connect(mongoURI, {
      // useNewUrlParser: true,      // 修正: usenewurlparser -> useNewUrlParser
      // useUnifiedTopology: true,   // 修正: useunifiedtopology -> useUnifiedTopology
      // useCreateIndex: true,       // 修正: usecreateindex -> useCreateIndex
      // useFindAndModify: false     // 修正: usefindandmodify -> useFindAndModify
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;