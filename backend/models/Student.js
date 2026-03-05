import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
  },
  year: {
    type: Number,
    required: true, // e.g., 1 or 2 for MCA
  },
  semester: {
    type: Number,
    required: true, // e.g., 1, 2, 3, 4
  },
  department: {
    type: String,
    default: 'MCA',
  },
  batch: {
    type: String, // e.g., "2024-2026"
  },
  password: {
    type: String,
    required: true,
  },
  selectedCourse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null,
  },
}, { timestamps: true });

studentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const Student = mongoose.model('Student', studentSchema);
export default Student;
