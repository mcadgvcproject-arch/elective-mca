import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';
import connectDB from './config/db.js';

dotenv.config();
connectDB();

const createAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ username: 'uadmin' });
    if (adminExists) {
      console.log('Admin already exists');
      process.exit();
    }

    await Admin.create({
      username: 'uadmin',
      password: 'upassadmin' // Change this!
    });

    console.log('Admin created successfully');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();
