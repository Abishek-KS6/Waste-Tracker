// ============================================================
//  routes/zoneRoutes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const Zone    = require('../models/Zone');
const User    = require('../models/User');
const Bin     = require('../models/Bin');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/zones — all zones with bin data
router.get('/', protect, async (req, res) => {
  try {
    const zones = await Zone.find({ isActive: true });
    // Attach live bin data to each zone
    const zonesWithBins = await Promise.all(zones.map(async (zone) => {
      const bins = await Bin.find({ zoneId: zone.zoneId, isActive: true });
      return { ...zone.toObject(), bins };
    }));
    res.json(zonesWithBins);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/zones/my — get current collector's zone
router.get('/my', protect, async (req, res) => {
  try {
    if (!req.user.zoneId) return res.status(404).json({ message: 'No zone assigned yet' });
    const zone = await Zone.findOne({ zoneId: req.user.zoneId });
    const bins = await Bin.find({ zoneId: req.user.zoneId, isActive: true });
    res.json({ ...zone.toObject(), bins });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/zones/collectors — list all collectors (for admin dropdown)
router.get('/collectors', protect, authorize('admin'), async (req, res) => {
  try {
    const collectors = await User.find({ role: 'collector', isActive: true }).select('-password');
    res.json(collectors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/zones/:zoneId/assign — admin assigns collector to zone
router.put('/:zoneId/assign', protect, authorize('admin'), async (req, res) => {
  try {
    const { collectorId } = req.body;
    const { zoneId } = req.params;

    const collector = await User.findById(collectorId);
    if (!collector || collector.role !== 'collector')
      return res.status(400).json({ message: 'Invalid collector' });

    // Unassign collector from previous zone
    await Zone.findOneAndUpdate(
      { collectorId },
      { collectorId: null, collectorName: null }
    );

    // Assign to new zone
    const zone = await Zone.findOneAndUpdate(
      { zoneId },
      { collectorId: collector._id, collectorName: collector.name },
      { new: true }
    );

    // Update collector's zoneId
    await User.findByIdAndUpdate(collectorId, { zoneId });

    console.log(`[Zone] ${collector.name} assigned to ${zoneId}`);
    res.json({ message: `${collector.name} assigned to ${zone.name}`, zone });

  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/zones/:zoneId/unassign — remove collector from zone
router.put('/:zoneId/unassign', protect, authorize('admin'), async (req, res) => {
  try {
    const zone = await Zone.findOneAndUpdate(
      { zoneId: req.params.zoneId },
      { collectorId: null, collectorName: null },
      { new: true }
    );
    if (zone.collectorId) {
      await User.findByIdAndUpdate(zone.collectorId, { zoneId: null });
    }
    res.json({ message: 'Collector removed from zone', zone });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
