const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema({
  binId:       { type: String, required: true },
  distanceCm:  { type: Number, required: true },
  fillPercent: { type: Number, required: true },
  statusCode:  { type: Number, required: true },
  status:      { type: String, enum: ['OK', 'HALF', 'FULL'] },
  recordedAt:  { type: Date, default: Date.now },
}, { timestamps: true });

SensorReadingSchema.index({ binId: 1, recordedAt: -1 });

module.exports = mongoose.model('SensorReading', SensorReadingSchema);