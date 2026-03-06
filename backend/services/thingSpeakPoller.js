// ============================================================
//  services/thingSpeakPoller.js
//  4 real Wokwi sensors (one per zone lead bin)
//  16 simulated bins
// ============================================================
const axios         = require('axios');
const SensorReading = require('../models/SensorReading');
const Bin           = require('../models/Bin');

const INTERVAL_MS = parseInt(process.env.THINGSPEAK_POLL_INTERVAL) || 15000;

// ─── 4 Real sensors — each has its own ThingSpeak channel ───
const REAL_BINS = [
  { binId: 'BIN_001', zoneId: 'ZONE_A', channelId: process.env.THINGSPEAK_CHANNEL_ID_1, readKey: process.env.THINGSPEAK_READ_API_KEY_1 },
  { binId: 'BIN_006', zoneId: 'ZONE_B', channelId: process.env.THINGSPEAK_CHANNEL_ID_2, readKey: process.env.THINGSPEAK_READ_API_KEY_2 },
  { binId: 'BIN_011', zoneId: 'ZONE_C', channelId: process.env.THINGSPEAK_CHANNEL_ID_3, readKey: process.env.THINGSPEAK_READ_API_KEY_3 },
  { binId: 'BIN_016', zoneId: 'ZONE_D', channelId: process.env.THINGSPEAK_CHANNEL_ID_4, readKey: process.env.THINGSPEAK_READ_API_KEY_4 },
];

// ─── 16 Simulated bins (4 per zone, excluding zone lead) ────
const SIM_BINS = [
  { binId: 'BIN_002', zoneId: 'ZONE_A' },
  { binId: 'BIN_003', zoneId: 'ZONE_A' },
  { binId: 'BIN_004', zoneId: 'ZONE_A' },
  { binId: 'BIN_005', zoneId: 'ZONE_A' },
  { binId: 'BIN_007', zoneId: 'ZONE_B' },
  { binId: 'BIN_008', zoneId: 'ZONE_B' },
  { binId: 'BIN_009', zoneId: 'ZONE_B' },
  { binId: 'BIN_010', zoneId: 'ZONE_B' },
  { binId: 'BIN_012', zoneId: 'ZONE_C' },
  { binId: 'BIN_013', zoneId: 'ZONE_C' },
  { binId: 'BIN_014', zoneId: 'ZONE_C' },
  { binId: 'BIN_015', zoneId: 'ZONE_C' },
  { binId: 'BIN_017', zoneId: 'ZONE_D' },
  { binId: 'BIN_018', zoneId: 'ZONE_D' },
  { binId: 'BIN_019', zoneId: 'ZONE_D' },
  { binId: 'BIN_020', zoneId: 'ZONE_D' },
];

// ─── Simulated fill states (different starting points) ──────
const simState = {};
SIM_BINS.forEach((bin, i) => {
  simState[bin.binId] = { fill: (i * 6 + 5) % 75 };
});

// ─── Track last entry per real bin to avoid duplicates ──────
const lastEntryIds = {
  BIN_001: null,
  BIN_006: null,
  BIN_011: null,
  BIN_016: null,
};

// ─── Start polling ───────────────────────────────────────────
function startThingSpeakPoller(io) {
  console.log(`[Poller] Starting — 4 real sensors + 16 simulated bins`);
  console.log(`[Poller] Channels: ${REAL_BINS.map(b => `${b.binId}→${b.channelId}`).join(', ')}`);
  pollAll(io);
  setInterval(() => pollAll(io), INTERVAL_MS);
}

// ─── Poll all bins ───────────────────────────────────────────
async function pollAll(io) {
  await pollRealBins(io);
  await pollSimulatedBins(io);
}

// ─── Real bins: fetch from ThingSpeak ───────────────────────
async function pollRealBins(io) {
  for (const sensor of REAL_BINS) {
    try {
      const url = `https://api.thingspeak.com/channels/${sensor.channelId}/feeds/last.json?api_key=${sensor.readKey}`;
      const { data: feed } = await axios.get(url, { timeout: 8000 });

      if (!feed || !feed.entry_id) {
        console.log(`[Poller] ${sensor.binId}: No data yet from channel ${sensor.channelId}`);
        continue;
      }

      if (feed.entry_id === lastEntryIds[sensor.binId]) {
        console.log(`[Poller] ${sensor.binId}: No new data (entry #${feed.entry_id})`);
        continue;
      }

      lastEntryIds[sensor.binId] = feed.entry_id;

      const distanceCm  = parseFloat(feed.field1) || 0;
      const fillPercent = parseFloat(feed.field2) || 0;
      const statusCode  = parseInt(feed.field3)   || 0;
      const status      = getStatus(fillPercent);

      await saveReading(sensor.binId, sensor.zoneId, distanceCm, fillPercent, statusCode, status, io);
      console.log(`[Poller] ${sensor.binId} (REAL) | Channel: ${sensor.channelId} | Fill: ${fillPercent}% | ${status}`);

    } catch (err) {
      console.error(`[Poller] ${sensor.binId} error:`, err.message);
    }
  }
}

// ─── Simulated bins ──────────────────────────────────────────
async function pollSimulatedBins(io) {
  for (const bin of SIM_BINS) {
    try {
      const state = simState[bin.binId];
      state.fill += Math.random() * 5 + 1;

      // Auto reset at 95% (simulates collection)
      if (state.fill >= 95) {
        state.fill = Math.random() * 8;
        console.log(`[Poller] ${bin.binId}: Auto-reset after collection`);
      }

      const fillPercent = parseFloat(state.fill.toFixed(1));
      const distanceCm  = parseFloat(((100 - fillPercent) / 100 * 30).toFixed(1));
      const status      = getStatus(fillPercent);
      const statusCode  = status === 'OK' ? 0 : status === 'HALF' ? 1 : 2;

      await saveReading(bin.binId, bin.zoneId, distanceCm, fillPercent, statusCode, status, io);

    } catch (err) {
      console.error(`[Poller] ${bin.binId} error:`, err.message);
    }
  }
}

// ─── Save reading to DB + emit socket events ─────────────────
async function saveReading(binId, zoneId, distanceCm, fillPercent, statusCode, status, io) {
  const reading = await SensorReading.create({
    binId, distanceCm, fillPercent, statusCode, status, recordedAt: new Date(),
  });

  await Bin.findOneAndUpdate(
    { binId },
    { fillPercent, status, lastUpdated: new Date() },
    { upsert: true }
  );

  // Broadcast real-time update
  io.emit('bin_update', {
    binId, zoneId, distanceCm, fillPercent,
    status, statusCode, recordedAt: reading.recordedAt,
  });

  // Alert if FULL
  if (status === 'FULL') {
    const bin = await Bin.findOne({ binId });
    io.emit('bin_alert', {
      binId, zoneId,
      message: `⚠️ ${binId} at ${bin?.location} (${zoneId}) is FULL!`,
      fillPercent,
      timestamp: new Date(),
    });
    console.log(`[Alert] 🚨 ${binId} is FULL!`);
  }
}

// ─── Helper ──────────────────────────────────────────────────
function getStatus(fill) {
  if (fill >= 80) return 'FULL';
  if (fill >= 50) return 'HALF';
  return 'OK';
}

module.exports = { startThingSpeakPoller };