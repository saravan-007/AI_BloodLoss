const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`);
    console.warn('⚠️ Server will continue running without database connection. Some features may not work.');
    // process.exit(1); // Removed to prevent server crash
  }
};

module.exports = connectDB;
