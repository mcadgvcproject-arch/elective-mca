import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Admin from '../models/Admin.js';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's a student or admin
      let user = await Student.findById(decoded.id).select('-password');
      if (!user) {
        user = await Admin.findById(decoded.id).select('-password');
        if (user) {
            req.isAdmin = true;
        }
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.isAdmin) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

export { protect, adminOnly };
