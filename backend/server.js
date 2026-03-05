import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import createCourseRoutes from './routes/courses.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

connectDB();

const app = express();
const server = http.createServer(app);

// Determine allowed origins
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction
  ? [process.env.FRONTEND_URL || true] // true = same origin only in production
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: isProduction ? undefined : allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid blocking inline styles/scripts in SPA
}));

// CORS configuration
app.use(cors({
  origin: isProduction ? undefined : allowedOrigins, // undefined = same-origin only in production
  credentials: true,
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login attempts per 15 min
  message: { message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', createCourseRoutes(io));
app.use('/api/admin', adminRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from frontend dist
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  // Handle SPA routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
