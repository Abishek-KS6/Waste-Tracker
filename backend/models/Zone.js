// ============================================================
//  models/Zone.js — Zone with assigned collector
// ============================================================
const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
  zoneId:      { type: String, required: true, unique: true }, // ZONE_A, ZONE_B...
  name:        { type: String, required: true },               // Main Campus
  description: { type: String },
  collectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  collectorName: { type: String, default: null },
  binIds:      [{ type: String }],                             // ['BIN_001',...'BIN_005']
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Zone', ZoneSchema);
