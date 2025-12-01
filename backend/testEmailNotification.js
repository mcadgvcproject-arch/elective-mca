import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Course.js';
import Student from './models/Student.js';
import { sendEmail } from './utils/emailService.js';

dotenv.config();

const testEmailNotification = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find a course with teacherEmail or create a test one
    let testCourse = await Course.findOne({ teacherEmail: { $exists: true, $ne: '' } });
    
    if (!testCourse) {
      console.log('⚠️ No course with teacher email found. Creating a test course...');
      testCourse = await Course.create({
        name: 'Test Course - Email Notification',
        teacher: 'Test Teacher',
        teacherEmail: process.env.EMAIL_USER, // Send to yourself for testing
        capacity: 3,
        semester: 1,
        description: 'Test course for email notification'
      });
      console.log('✅ Test course created');
    }

    console.log(`\n📚 Using Course: ${testCourse.name}`);
    console.log(`👨‍🏫 Teacher: ${testCourse.teacher}`);
    console.log(`📧 Teacher Email: ${testCourse.teacherEmail}`);
    console.log(`🪑 Capacity: ${testCourse.capacity}`);
    console.log(`👥 Currently Enrolled: ${testCourse.enrolledStudents.length}`);

    // Get enrolled students
    const enrolledStudents = await Student.find({ 
      _id: { $in: testCourse.enrolledStudents } 
    }).select('name rollNumber year semester batch');

    console.log('\n📋 Enrolled Students:');
    if (enrolledStudents.length === 0) {
      console.log('   (No students enrolled yet)');
    } else {
      enrolledStudents.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} (${s.rollNumber}) - Year ${s.year}, Sem ${s.semester}`);
      });
    }

    // Simulate sending the email as if the course just filled up
    console.log('\n📨 Sending test email notification with CSV attachment...\n');

    // Create CSV content
    const csvHeader = 'S.No,Name,Roll Number,Year,Semester,Batch\n';
    const csvRows = enrolledStudents.length > 0
      ? enrolledStudents.map((s, index) => 
          `${index + 1},"${s.name}","${s.rollNumber}",${s.year},${s.semester},"${s.batch || '-'}"`
        ).join('\n')
      : '1,"Test Student","TEST001",1,2,"2024"';
    const csvContent = csvHeader + csvRows;

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const safeCourseName = testCourse.name.replace(/[^a-zA-Z0-9]/g, '_');
    const csvFilename = `${safeCourseName}_Students_${date}.csv`;

    // Create student list HTML
    const studentListHTML = enrolledStudents.length > 0 
      ? enrolledStudents.map((s, index) => 
          `<tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.rollNumber}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">Year ${s.year}, Sem ${s.semester}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.batch || '-'}</td>
          </tr>`
        ).join('')
      : `<tr><td colspan="5" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No students enrolled yet (this is a test)</td></tr>`;
    
    // Create student list text
    const studentListText = enrolledStudents.length > 0
      ? enrolledStudents.map((s, index) => 
          `${index + 1}. ${s.name} (${s.rollNumber}) - Year ${s.year}, Sem ${s.semester}, Batch: ${s.batch || '-'}`
        ).join('\n')
      : '(No students enrolled yet - this is a test email)';

    const result = await sendEmail({
      to: testCourse.teacherEmail,
      subject: `🎓 [TEST] Course Filled: ${testCourse.name} - Complete Student List`,
      text: `Hello ${testCourse.teacher},

This is a TEST email notification.

Your course "${testCourse.name}" has reached its full capacity of ${testCourse.capacity} students.

Here is the complete list of enrolled students:

${studentListText}

A CSV file with the student list is attached for your convenience.

Regards,
Elective Course Selector System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #FFF3E0; padding: 10px; border-radius: 8px; margin-bottom: 20px;">
            <strong>⚠️ This is a TEST email</strong>
          </div>
          
          <h2 style="color: #46281A;">🎓 Course Filled Notification</h2>
          <p>Hello <strong>${testCourse.teacher}</strong>,</p>
          <p>Your course <strong>"${testCourse.name}"</strong> has reached its full capacity of <strong>${testCourse.capacity} students</strong>.</p>
          
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

    if (result.error) {
      console.log('❌ Email failed:', result.message);
    } else {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`\n📬 Check inbox: ${testCourse.teacherEmail}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

testEmailNotification();
