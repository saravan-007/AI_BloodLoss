const mongoose = require('mongoose');
const Nurse = require('./server/models/Nurse');
require('dotenv').config({ path: './server/.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const nurses = await Nurse.find({});
  console.log('Nurses in DB:', nurses);
  process.exit();
}

check();
