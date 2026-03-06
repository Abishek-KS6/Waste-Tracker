const express       = require('express');
const router        = express.Router();
const SensorReading = require('../models/SensorReading');
const { protect }   = require('../middleware/authMiddleware');

router.get('/latest', protect, async (req, res) => {
  try {
    const latest = await SensorReading.findOne({ binId: 'BIN_001' }).sort({ recordedAt: -1 });
    res.json(latest);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/history', protect, async (req, res) => {
  try {
    const { binId = 'BIN_001', limit = 50 } = req.query;
    const readings = await SensorReading
      .find({ binId })
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit));
    res.json(readings);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/today', protect, async (req, res) => {
  try {
    const { binId = 'BIN_001' } = req.query;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const readings = await SensorReading
      .find({ binId, recordedAt: { $gte: startOfDay } })
      .sort({ recordedAt: 1 });
    res.json(readings);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;