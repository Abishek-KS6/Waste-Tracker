const express  = require('express');
const router   = express.Router();
const Bin      = require('../models/Bin');
const SensorReading = require('../models/SensorReading');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/bins?zoneId=ZONE_A — filter by zone
router.get('/', protect, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.zoneId) filter.zoneId = req.query.zoneId;
    const bins = await Bin.find(filter).sort({ binId: 1 });
    res.json(bins);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/bins/:binId
router.get('/:binId', protect, async (req, res) => {
  try {
    const bin = await Bin.findOne({ binId: req.params.binId });
    if (!bin) return res.status(404).json({ message: 'Bin not found' });
    res.json(bin);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/bins — admin only
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const bin = await Bin.create(req.body);
    res.status(201).json(bin);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT /api/bins/:binId — admin only
router.put('/:binId', protect, authorize('admin'), async (req, res) => {
  try {
    const bin = await Bin.findOneAndUpdate({ binId: req.params.binId }, req.body, { new: true });
    if (!bin) return res.status(404).json({ message: 'Bin not found' });
    res.json(bin);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/bins/:binId — admin only
router.delete('/:binId', protect, authorize('admin'), async (req, res) => {
  try {
    await Bin.findOneAndUpdate({ binId: req.params.binId }, { isActive: false });
    res.json({ message: 'Bin deactivated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/bins/:binId/collect — collector or admin
router.post('/:binId/collect', protect, authorize('collector', 'admin'), async (req, res) => {
  try {
    const { binId } = req.params;

    const bin = await Bin.findOneAndUpdate(
      { binId },
      { fillPercent: 0, status: 'OK', lastUpdated: new Date() },
      { new: true }
    );
    if (!bin) return res.status(404).json({ message: 'Bin not found' });

    await SensorReading.create({
      binId, distanceCm: 30, fillPercent: 0,
      statusCode: 0, status: 'OK', recordedAt: new Date(),
    });

    const io = req.app.get('io');
    io.emit('bin_update', {
      binId, zoneId: bin.zoneId,
      distanceCm: 30, fillPercent: 0,
      status: 'OK', statusCode: 0,
      recordedAt: new Date(),
      collectedBy: req.user.name,
    });

    io.emit('bin_collected', {
      binId, zoneId: bin.zoneId,
      location: bin.location,
      collectedBy: req.user.name,
      timestamp: new Date(),
    });

    console.log(`[Collect] ${binId} collected by ${req.user.name}`);
    res.json({ message: `${binId} marked as collected`, bin });

  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
