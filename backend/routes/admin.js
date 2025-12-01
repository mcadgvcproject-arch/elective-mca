import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// --- Student Management ---

// Get all students (with optional filters)
router.get('/students', protect, adminOnly, async (req, res) => {
  try {
    const { year, semester, batch, search } = req.query;
    const query = {};

    if (year) query.year = year;
    if (semester) query.semester = semester;
    if (batch) query.batch = batch;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query).populate('selectedCourse', 'name');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a single student
router.post('/students', protect, adminOnly, async (req, res) => {
  try {
    const { name, rollNumber, year, semester, batch } = req.body;
    const student = await Student.create({
      name,
      rollNumber,
      year,
      semester,
      batch,
      password: rollNumber // Default password
    });
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a student
router.put('/students/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, rollNumber, year, semester, batch, password } = req.body;
    const student = await Student.findById(req.params.id);

    if (student) {
      student.name = name || student.name;
      student.rollNumber = rollNumber || student.rollNumber;
      student.year = year || student.year;
      student.semester = semester || student.semester;
      student.batch = batch || student.batch;
      if (password) student.password = password;

      const updatedStudent = await student.save();
      res.json(updatedStudent);
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a student
router.delete('/students/:id', protect, adminOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (student) {
      // If student has a selected course, we might want to decrement the count in the course
      // But for now, let's just delete the student. 
      // Ideally, we should pull the student from the Course.enrolledStudents array.
      if (student.selectedCourse) {
        await Course.findByIdAndUpdate(student.selectedCourse, {
            $pull: { enrolledStudents: student._id }
        });
      }
      
      await student.deleteOne();
      res.json({ message: 'Student removed' });
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload students via CSV
router.post('/upload-students', protect, adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log('CSV Upload Results:', results.length, 'rows found.');
      if (results.length > 0) {
        console.log('First row sample:', results[0]);
        console.log('Headers found:', Object.keys(results[0]));
      }

      try {
        // Expected Headers: Name, RollNumber, Year, Semester, Batch
        let count = 0;
        let errors = [];
        
        for (const row of results) {
            // Normalize keys to handle BOM or whitespace
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              const cleanKey = key.trim().replace(/^\ufeff/, '');
              normalizedRow[cleanKey] = row[key];
            });

            try {
                // Check if student exists
                const rollNumber = normalizedRow.RollNumber;
                if (!rollNumber) {
                    console.log('Skipping row due to missing RollNumber:', normalizedRow);
                    continue;
                }

                const exists = await Student.findOne({ rollNumber: rollNumber });
                if (!exists) {
                    await Student.create({
                        name: normalizedRow.Name,
                        rollNumber: rollNumber,
                        year: parseInt(normalizedRow.Year) || 1,
                        semester: parseInt(normalizedRow.Semester) || 1,
                        batch: normalizedRow.Batch || new Date().getFullYear(),
                        password: rollNumber // Default password
                    });
                    count++;
                }
            } catch (err) {
                errors.push(`Failed to add ${normalizedRow.RollNumber}: ${err.message}`);
            }
        }
        
        // Clean up file
        fs.unlinkSync(req.file.path);
        
        res.json({ message: `${count} students uploaded successfully`, errors: errors.length > 0 ? errors : undefined });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });
});

// --- Course Management (Admin Extras) ---

// Update a course
router.put('/courses/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, teacher, teacherEmail, capacity, syllabusLink, semester } = req.body;
    const course = await Course.findById(req.params.id);

    if (course) {
      course.name = name || course.name;
      course.description = description || course.description;
      course.teacher = teacher || course.teacher;
      course.teacherEmail = teacherEmail || course.teacherEmail;
      course.capacity = capacity || course.capacity;
      course.syllabusLink = syllabusLink || course.syllabusLink;
      course.semester = semester || course.semester;

      const updatedCourse = await course.save();
      res.json(updatedCourse);
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a course
router.delete('/courses/:id', protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (course) {
      // Reset selectedCourse for all enrolled students
      await Student.updateMany(
        { selectedCourse: course._id },
        { $set: { selectedCourse: null } }
      );
      
      await course.deleteOne();
      res.json({ message: 'Course removed' });
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Batch Semester Update ---

// Get all unique batches
router.get('/batches', protect, adminOnly, async (req, res) => {
  try {
    const batches = await Student.distinct('batch');
    res.json(batches.filter(b => b)); // Filter out null/empty values
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update semester for all students in a batch
router.put('/batch-semester', protect, adminOnly, async (req, res) => {
  try {
    const { batch, newSemester, newYear } = req.body;

    if (!batch) {
      return res.status(400).json({ message: 'Batch is required' });
    }

    if (!newSemester || newSemester < 1 || newSemester > 4) {
      return res.status(400).json({ message: 'Valid semester (1-4) is required' });
    }

    const updateData = { semester: newSemester };
    
    // Optionally update year as well
    if (newYear && newYear >= 1 && newYear <= 2) {
      updateData.year = newYear;
    }

    // Also reset selectedCourse when semester changes (students need to select new electives)
    updateData.selectedCourse = null;

    const result = await Student.updateMany(
      { batch: batch },
      { $set: updateData }
    );

    // Clear enrolled students from courses for this batch's students
    const studentsInBatch = await Student.find({ batch: batch }).select('_id');
    const studentIds = studentsInBatch.map(s => s._id);
    
    await Course.updateMany(
      {},
      { $pull: { enrolledStudents: { $in: studentIds } } }
    );

    res.json({ 
      message: `Successfully updated ${result.modifiedCount} students in batch ${batch} to semester ${newSemester}${newYear ? ` and year ${newYear}` : ''}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Increment semester for all students in a batch (promote to next semester)
router.put('/batch-promote', protect, adminOnly, async (req, res) => {
  try {
    const { batch } = req.body;

    if (!batch) {
      return res.status(400).json({ message: 'Batch is required' });
    }

    // Get all students in the batch
    const students = await Student.find({ batch: batch });
    
    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found in this batch' });
    }

    let promotedCount = 0;
    let graduatedCount = 0;

    for (const student of students) {
      let newSemester = student.semester + 1;
      let newYear = student.year;

      // If semester exceeds 4, student has graduated
      if (newSemester > 4) {
        graduatedCount++;
        continue; // Skip promoting graduated students
      }

      // Update year based on semester (semesters 1-2 = year 1, semesters 3-4 = year 2)
      if (newSemester >= 3) {
        newYear = 2;
      }

      student.semester = newSemester;
      student.year = newYear;
      student.selectedCourse = null; // Reset course selection
      await student.save();
      promotedCount++;
    }

    // Clear enrolled students from courses
    const studentIds = students.map(s => s._id);
    await Course.updateMany(
      {},
      { $pull: { enrolledStudents: { $in: studentIds } } }
    );

    res.json({ 
      message: `Promoted ${promotedCount} students to next semester. ${graduatedCount} students have completed all semesters.`,
      promotedCount,
      graduatedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
