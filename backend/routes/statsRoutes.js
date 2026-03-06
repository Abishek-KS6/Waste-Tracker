const express       = require('express');
const router        = express.Router();
const SensorReading = require('../models/SensorReading');
const { protect }   = require('../middleware/authMiddleware');

router.get('/summary', protect, async (req, res) => {
  try {
    const total     = await SensorReading.countDocuments();
    const fullCount = await SensorReading.countDocuments({ status: 'FULL' });
    const halfCount = await SensorReading.countDocuments({ status: 'HALF' });
    const avgResult = await SensorReading.aggregate([
      { $group: { _id: null, avgFill: { $avg: '$fillPercent' } } }
    ]);
    const avgFill = avgResult[0]?.avgFill?.toFixed(1) || 0;
    res.json({ total, fullCount, halfCount, avgFill });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/weekly', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const data = await SensorReading.aggregate([
      { $match: { recordedAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$recordedAt' } },
        avgFill: { $avg: '$fillPercent' },
        maxFill: { $max: '$fillPercent' },
        count:   { $sum: 1 },
      }},
      { $sort: { _id: 1 } }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/status-breakdown', protect, async (req, res) => {
  try {
    const data = await SensorReading.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;