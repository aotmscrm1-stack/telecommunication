const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');

const DEFAULT_COURSES = [
  { name: 'Full Stack', cost: 35000, duration: '6 Months' },
  { name: 'Java Full Stack', cost: 40000, duration: '6 Months' },
  { name: 'Python Full Stack', cost: 40000, duration: '6 Months' },
  { name: 'MEAN Stack', cost: 35000, duration: '6 Months' },
  { name: 'MERN Stack', cost: 35000, duration: '6 Months' },
  { name: 'Data Analytics', cost: 30000, duration: '4 Months' },
  { name: 'Data Science', cost: 45000, duration: '6 Months' },
  { name: 'Data Engineering', cost: 45000, duration: '6 Months' },
  { name: 'AI & Machine Learning', cost: 50000, duration: '6 Months' },
  { name: 'Quantum Computing', cost: 60000, duration: '6 Months' },
  { name: 'DevOps', cost: 35000, duration: '4 Months' },
  { name: 'Multi-Cloud Consultant', cost: 40000, duration: '4 Months' },
  { name: 'Cyber Security', cost: 45000, duration: '6 Months' },
  { name: 'QA Automation', cost: 25000, duration: '3 Months' },
  { name: 'Embedded Systems', cost: 35000, duration: '6 Months' },
  { name: 'UI/UX Design', cost: 25000, duration: '3 Months' },
];

async function seedIfEmpty() {
  const count = await Course.countDocuments();
  if (count === 0) {
    await Course.insertMany(DEFAULT_COURSES.map(c => ({ ...c, isActive: true })));
  }
}

// GET /api/courses - Get all active courses
router.get('/', protect, async (req, res) => {
  try {
    await seedIfEmpty();
    const courses = await Course.find({ isActive: true }).sort({ name: 1 });
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courses/all - Get all courses (including inactive ones, admin/admin only)
router.get('/all', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    await seedIfEmpty();
    const courses = await Course.find({}).sort({ name: 1 });
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courses/:id - Get a single course
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/courses - Create a course (admin/admin only)
router.post('/', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { name, cost, duration, description } = req.body;
    if (!name || cost === undefined) {
      return res.status(400).json({ message: 'Name and cost are required' });
    }
    const exists = await Course.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Course with this name already exists' });

    const course = await Course.create({ name, cost, duration, description });
    res.status(201).json({ course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/courses/:id - Update a course (admin/admin only)
router.put('/:id', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/courses/:id - Delete a course (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;