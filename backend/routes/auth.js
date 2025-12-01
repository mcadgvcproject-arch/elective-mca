import express from 'express';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import Log from '../models/Log.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Student Login
router.post('/student/login', async (req, res) => {
  const { rollNumber, password } = req.body;

  try {
    const student = await Student.findOne({ rollNumber });

    if (student && (await student.matchPassword(password))) {
      // Log login
      await Log.create({
        action: 'LOGIN',
        user: rollNumber,
        details: 'Student logged in',
        ip: req.ip
      });

      res.json({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        selectedCourse: student.selectedCourse,
        token: generateToken(student._id),
        isAdmin: false
      });
    } else {
      res.status(401).json({ message: 'Invalid roll number or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });

    if (admin && (await admin.matchPassword(password))) {
       // Log login
       await Log.create({
        action: 'LOGIN',
        user: username,
        details: 'Admin logged in',
        ip: req.ip
      });

      res.json({
        _id: admin._id,
        username: admin.username,
        token: generateToken(admin._id),
        isAdmin: true
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
