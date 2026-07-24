const mongoose = require('mongoose');
require('dotenv').config();
const Doctor = require('./models/Doctor');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  try {
    const data = {
      fullName: 'Test Doctor',
      email: 'testdoc123@gmail.com',
      hospitalName: 'Test Hospital',
      isVerified: true,
      specialization: 'Surgeon'
    };
    const user = await Doctor.create(data);
    console.log('Created user:', user);

    const found = await Doctor.findOne({ email: 'testdoc123@gmail.com' });
    console.log('Found user:', found);
    
    // Clean up
    await Doctor.deleteOne({ email: 'testdoc123@gmail.com' });
  } catch (err) {
    console.error('Error:', err);
  }

  process.exit();
}

test();
