// ============================================================
//  seedData.js — Run once to populate 20 bins & 4 zones
//  Usage: node seedData.js
// ============================================================
require('dotenv').config();
const mongoose = require('mongoose');
const Bin  = require('./models/Bin');
const Zone = require('./models/Zone');

const ZONES = [
  {
    zoneId: 'ZONE_A',
    name: 'Main Campus',
    description: 'Administrative & Academic Buildings',
    bins: [
      { binId: 'BIN_001', location: 'Main Gate Entrance',     isReal: true  },
      { binId: 'BIN_002', location: 'Admin Block Lobby',      isReal: false },
      { binId: 'BIN_003', location: 'Lecture Hall A',         isReal: false },
      { binId: 'BIN_004', location: 'Lecture Hall B',         isReal: false },
      { binId: 'BIN_005', location: 'Principal Office',       isReal: false },
    ]
  },
  {
    zoneId: 'ZONE_B',
    name: 'Hostel Block',
    description: 'Student Residential Area',
    bins: [
      { binId: 'BIN_006', location: 'Hostel A - Ground Floor', isReal: true  },
      { binId: 'BIN_007', location: 'Hostel A - First Floor',  isReal: false },
      { binId: 'BIN_008', location: 'Hostel B - Ground Floor', isReal: false },
      { binId: 'BIN_009', location: 'Hostel B - First Floor',  isReal: false },
      { binId: 'BIN_010', location: 'Common Room',             isReal: false },
    ]
  },
  {
    zoneId: 'ZONE_C',
    name: 'Sports Complex',
    description: 'Sports & Recreation Area',
    bins: [
      { binId: 'BIN_011', location: 'Football Ground',         isReal: true  },
      { binId: 'BIN_012', location: 'Basketball Court',        isReal: false },
      { binId: 'BIN_013', location: 'Indoor Stadium',          isReal: false },
      { binId: 'BIN_014', location: 'Swimming Pool',           isReal: false },
      { binId: 'BIN_015', location: 'Gym Entrance',            isReal: false },
    ]
  },
  {
    zoneId: 'ZONE_D',
    name: 'Shopping Area',
    description: 'Canteen, Shops & Food Court',
    bins: [
      { binId: 'BIN_016', location: 'Main Canteen',            isReal: true  },
      { binId: 'BIN_017', location: 'Food Court',              isReal: false },
      { binId: 'BIN_018', location: 'Stationery Shop',         isReal: false },
      { binId: 'BIN_019', location: 'Mini Mart',               isReal: false },
      { binId: 'BIN_020', location: 'Canteen Exit',            isReal: false },
    ]
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] MongoDB connected');

    // Clear existing
    await Bin.deleteMany({});
    await Zone.deleteMany({});
    console.log('[Seed] Cleared existing bins and zones');

    // Create bins and zones
    for (const zone of ZONES) {
      const binIds = zone.bins.map(b => b.binId);

      // Create zone
      await Zone.create({
        zoneId:      zone.zoneId,
        name:        zone.name,
        description: zone.description,
        binIds,
        collectorId:   null,
        collectorName: null,
      });

      // Create bins for this zone
      for (const bin of zone.bins) {
        await Bin.create({
          binId:       bin.binId,
          zoneId:      zone.zoneId,
          location:    bin.location,
          fillPercent: Math.floor(Math.random() * 60), // random initial fill
          status:      'OK',
          isReal:      bin.isReal,
        });
      }

      console.log(`[Seed] Zone ${zone.zoneId} (${zone.name}) — ${binIds.length} bins created`);
    }

    console.log('\n✅ Seed complete! 20 bins across 4 zones created.');
    console.log('Real sensors: BIN_001, BIN_006, BIN_011, BIN_016');
    process.exit(0);

  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  }
}

seed();
