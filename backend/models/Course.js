import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  teacher: {
    type: String,
    required: true,
  },
  teacherEmail: {
    type: String,
    // required: true, // Optional for now to avoid breaking existing courses
  },
  semester: {
    type: Number,
    required: true, // The semester this elective is offered for
  },
  department: {
    type: String,
    default: 'MCA',
  },
  capacity: {
    type: Number,
    default: 20,
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  }],
  syllabusLink: {
    type: String, // URL to the PDF
  },
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);
export default Course;
