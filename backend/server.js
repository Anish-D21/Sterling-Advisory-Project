/**
 * server.js — Sterling Advisory Backend
 * Node.js + Express + MongoDB + JWT
 */

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
require('dotenv').config();

const app = express();

// ═══════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Allow frontend requests
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

// ═══════════════════════════════════════════════
// BODY PARSING
// ═══════════════════════════════════════════════

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ═══════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many requests — try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});

// ═══════════════════════════════════════════════
// STATIC FRONTEND
// ═══════════════════════════════════════════════

app.use(express.static(path.join(__dirname, '../frontend')));

// ═══════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.log('⚠️ MongoDB not connected — running in demo mode');
    console.error(err.message);
  }
}

// ═══════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════

const { router: authRouter } = require('./routes/auth');
const advisorRouter = require('./routes/advisor');
const chatbotRoutes = require('./routes/chatbot'); // ✅ FIXED

// Auth routes
app.use('/api/auth', authLimiter, authRouter);

// Advisor routes
app.use('/api/advisor', apiLimiter, advisorRouter);

// Chatbot routes (FIXED)
app.use('/api/chatbot', apiLimiter, chatbotRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Sterling Advisory API',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════
// SPA ROUTE (frontend fallback)
// ═══════════════════════════════════════════════

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ═══════════════════════════════════════════════
// ERROR HANDLER
// ═══════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: err.message || 'Internal server error'
  });
});

// ═══════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║   Sterling Advisory Backend Running  ║
╠══════════════════════════════════════╣
║  Port: ${PORT}
║  API:  http://localhost:${PORT}/api/health
║  App:  http://localhost:${PORT}
╚══════════════════════════════════════╝
    `);
  });
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});