// ============================================================
//  models/Bin.js — Waste bin with zone assignment
// ============================================================
const mongoose = require('mongoose');

const BinSchema = new mongoose.Schema({
  binId:       { type: String, required: true, unique: true },
  zoneId:      { type: String, required: true },
  location:    { type: String, required: true },
  binHeight:   { type: Number, default: 30 },
  fillPercent: { type: Number, default: 0 },
  status:      { type: String, enum: ['OK', 'HALF', 'FULL'], default: 'OK' },
  isReal:      { type: Boolean, default: false }, // true = real Wokwi sensor
  thingSpeakChannel: { type: String, default: null }, // channel id if real
  lastUpdated: { type: Date, default: Date.now },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Bin', BinSchema);
