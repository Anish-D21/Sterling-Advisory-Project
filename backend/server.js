/**
 * server.js — Sterling Advisory Backend
 * Node.js + Express + MongoDB + JWT
 *
 * Start: node server.js
 * Requires: .env with MONGO_URI, JWT_SECRET, PORT
 */

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
require('dotenv').config();

const app = express();

// ══════════════════════════════════════════════════════════════
//  SECURITY MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// Set security headers
app.use(helmet({
  contentSecurityPolicy: false,  // Allow CDN assets for frontend
  crossOriginEmbedderPolicy: false
}));

// CORS — allow frontend origin
app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true
}));

// Rate limiting — prevent brute force on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  message: { message: 'Too many requests — please try again after 15 minutes' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 100
});

// ══════════════════════════════════════════════════════════════
//  BODY PARSING
// ══════════════════════════════════════════════════════════════

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ══════════════════════════════════════════════════════════════
//  STATIC FILES — Serve frontend
// ══════════════════════════════════════════════════════════════

app.use(express.static(path.join(__dirname, '../frontend')));

// ══════════════════════════════════════════════════════════════
//  DATABASE CONNECTION
// ══════════════════════════════════════════════════════════════

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Running without database (demo mode)');
    // Don't exit — allow demo mode without DB
  }
}

// ══════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════

const { router: authRouter } = require('./routes/auth');
const advisorRouter          = require('./routes/advisor');

// Apply rate limiting to auth
app.use('/api/auth',    authLimiter, authRouter);

// Advisor routes (financial calculations)
app.use('/api/advisor', apiLimiter,  advisorRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Sterling Advisory API',
    version: '1.0.0',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ── SPA Catch-all: Serve index.html for all non-API routes ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ══════════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER
// ══════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ══════════════════════════════════════════════════════════════
//  START SERVER
// ══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║      Sterling Advisory — Server Started       ║
╠══════════════════════════════════════════════╣
║  Port:    ${PORT}                               ║
║  Mode:    ${process.env.NODE_ENV || 'development'}                     ║
║  API:     http://localhost:${PORT}/api/health    ║
║  App:     http://localhost:${PORT}               ║
╚══════════════════════════════════════════════╝
    `);
  });
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});