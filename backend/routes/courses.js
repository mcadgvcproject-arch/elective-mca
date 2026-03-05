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

      // Check if course is full and send email with student details
      if (updatedCourse.enrolledStudents.length === updatedCourse.capacity) {
        if (updatedCourse.teacherEmail) {
            console.log(`Course ${updatedCourse.name} is full. Sending email to ${updatedCourse.teacherEmail}`);
            
            // Fetch all enrolled students with details
            const enrolledStudents = await Student.find({ 
              _id: { $in: updatedCourse.enrolledStudents } 
            }).select('name rollNumber year semester batch');
            
            // Create CSV content
            const csvHeader = 'S.No,Name,Roll Number,Year,Semester,Batch\n';
            const csvRows = enrolledStudents.map((s, index) => 
              `${index + 1},"${s.name}","${s.rollNumber}",${s.year},${s.semester},"${s.batch || '-'}"`
            ).join('\n');
            const csvContent = csvHeader + csvRows;
            
            // Create student list HTML
            const studentListHTML = enrolledStudents.map((s, index) => 
              `<tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${s.name}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${s.rollNumber}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">Year ${s.year}, Sem ${s.semester}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${s.batch || '-'}</td>
              </tr>`
            ).join('');
            
            // Create student list text
            const studentListText = enrolledStudents.map((s, index) => 
              `${index + 1}. ${s.name} (${s.rollNumber}) - Year ${s.year}, Sem ${s.semester}, Batch: ${s.batch || '-'}`
            ).join('\n');

            // Generate filename with course name and date
            const date = new Date().toISOString().split('T')[0];
            const safeCourseName = updatedCourse.name.replace(/[^a-zA-Z0-9]/g, '_');
            const csvFilename = `${safeCourseName}_Students_${date}.csv`;

            await sendEmail({
                to: updatedCourse.teacherEmail,
                subject: `🎓 Course Filled: ${updatedCourse.name} - Complete Student List`,
                text: `Hello ${updatedCourse.teacher},

Your course "${updatedCourse.name}" has reached its full capacity of ${updatedCourse.capacity} students.

Here is the complete list of enrolled students:

${studentListText}

A CSV file with the student list is attached for your convenience.

Regards,
Elective Course Selector System`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #46281A;">🎓 Course Filled Notification</h2>
                    <p>Hello <strong>${updatedCourse.teacher}</strong>,</p>
                    <p>Your course <strong>"${updatedCourse.name}"</strong> has reached its full capacity of <strong>${updatedCourse.capacity} students</strong>.</p>
                    
                    <h3 style="color: #9C7248; margin-top: 20px;">📋 Enrolled Students</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                      <thead>
                        <tr style="background-color: #FFBF86;">
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">#</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Name</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Roll Number</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Year/Sem</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Batch</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${studentListHTML}
                      </tbody>
                    </table>
                    
                    <p style="margin-top: 20px; padding: 12px; background: #FFF3E0; border-radius: 8px;">
                      📎 <strong>Attachment:</strong> A CSV file with the complete student list is attached to this email.
                    </p>
                    
                    <p style="margin-top: 20px; color: #666;">
                      <em>This is an automated message from the Elective Course Selector System.</em>
                    </p>
                  </div>
                `,
                attachments: [
                  {
                    filename: csvFilename,
                    content: csvContent,
                    contentType: 'text/csv'
                  }
                ]
            });
            console.log(`Email sent to ${updatedCourse.teacherEmail} with ${enrolledStudents.length} student details and CSV attachment`);
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
