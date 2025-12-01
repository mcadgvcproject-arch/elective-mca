import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import createCourseRoutes from './routes/courses.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for now, restrict in production
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/courses', createCourseRoutes(io));
app.use('/api/admin', adminRoutes);

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
