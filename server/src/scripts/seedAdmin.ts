import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Admin } from '../models/Admin';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const email = process.env.ADMIN_EMAIL || 'admin@streamsaga.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const name = process.env.ADMIN_NAME || 'Weftvix Admin';

  let admin = await Admin.findOne({ email });
  if (admin) {
    admin.name = name;
    admin.password = password;
    await admin.save();
    console.log(`✅ Admin updated: ${email}`);
  } else {
    admin = new Admin({ name, email, password });
    await admin.save();
    console.log(`✅ Admin created: ${email}`);
  }
  console.log(`   Password: ${password}`);
  console.log(`   ⚠️  Change this password immediately after first login!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
