const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes   = require('./routes/authRoutes');
const binRoutes    = require('./routes/binRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const statsRoutes  = require('./routes/statsRoutes');
const zoneRoutes   = require('./routes/zoneRoutes');
const { startThingSpeakPoller } = require('./services/thingSpeakPoller');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth',   authRoutes);
app.use('/api/bins',   binRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/stats',  statsRoutes);
app.use('/api/zones',  zoneRoutes);

app.get('/', (req, res) => res.json({ status: 'Waste Tracker V2 API running ✅ — 20 bins, 4 zones' }));

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Socket] Disconnected: ${socket.id}`));
});

app.set('io', io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[MongoDB] Connected ✅');
    startThingSpeakPoller(io);
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`[Server] Running on http://localhost:${PORT} 🚀`));
  })
  .catch((err) => {
    console.error('[MongoDB] Failed ❌', err.message);
    process.exit(1);
  });
