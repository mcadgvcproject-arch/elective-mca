import express from 'express';
import Course from '../models/Course.js';
import Student from '../models/Student.js';
import Log from '../models/Log.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { sendEmail } from '../utils/emailService.js';

const createCourseRouter = (io) => {
  const router = express.Router();

  // Get all courses
  router.get('/', protect, async (req, res) => {
    try {
      let query = {};
      
      // If it's a student, only show courses for their semester
      if (!req.isAdmin && req.user) {
        query.semester = req.user.semester;
      }

      const courses = await Course.find(query);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Select a course (Student only)
  router.post('/select/:id', protect, async (req, res) => {
    const courseId = req.params.id;
    const studentId = req.user._id;

    try {
      const course = await Course.findById(courseId);
      const student = await Student.findById(studentId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check semester eligibility
      if (course.semester !== student.semester) {
        return res.status(400).json({ message: 'This course is not available for your semester' });
      }

      if (student.selectedCourse) {
        return res.status(400).json({ message: 'You have already selected a course' });
      }

      if (course.enrolledStudents.length >= course.capacity) {
        return res.status(400).json({ message: 'Course is filled. Choose another.' });
      }

      // Atomic update to prevent race conditions
      const updatedCourse = await Course.findOneAndUpdate(
        { _id: courseId, $expr: { $lt: [{ $size: "$enrolledStudents" }, "$capacity"] } },
        { $push: { enrolledStudents: studentId } },
        { new: true }
      );

      if (!updatedCourse) {
         return res.status(400).json({ message: 'Course is filled. Choose another.' });
      }

      student.selectedCourse = courseId;
      await student.save();

      // Log selection
      await Log.create({
        action: 'COURSE_SELECT',
        user: student.rollNumber,
        details: `Selected course: ${course.name}`,
        ip: req.ip
      });

      // Emit update to all clients
      io.emit('courseUpdate', {
        courseId: course._id,
        enrolledCount: updatedCourse.enrolledStudents.length,
        capacity: updatedCourse.capacity
      });

      // Check if course is full and send email
      if (updatedCourse.enrolledStudents.length === updatedCourse.capacity) {
        if (updatedCourse.teacherEmail) {
            console.log(`Course ${updatedCourse.name} is full. Sending email to ${updatedCourse.teacherEmail}`);
            await sendEmail({
                to: updatedCourse.teacherEmail,
                subject: `Course Filled: ${updatedCourse.name}`,
                text: `Hello ${updatedCourse.teacher},\n\nYour course "${updatedCourse.name}" has reached its capacity of ${updatedCourse.capacity} students.\n\nRegards,\nElective Course Selector System`
            });
        } else {
            console.log(`Course ${updatedCourse.name} is full, but no teacher email configured.`);
        }
      }

      res.json({ message: 'Course selected successfully', course: updatedCourse });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add a course (Admin only)
  router.post('/', protect, adminOnly, async (req, res) => {
    const { name, description, teacher, teacherEmail, capacity, syllabusLink, semester } = req.body;

    try {
      const course = await Course.create({
        name,
        description,
        teacher,
        teacherEmail,
        capacity,
        syllabusLink,
        semester: semester || 1 // Default to sem 1 if not provided
      });

      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  return router;
};

export default createCourseRouter;
