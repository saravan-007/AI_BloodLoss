const mongoose = require('mongoose');
require('dotenv').config();
const Doctor = require('./models/Doctor');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const existing = await Doctor.findOne({ email: 'test@example.com' });
  console.log('Existing doctor:', existing);
  
  process.exit();
}

test();
