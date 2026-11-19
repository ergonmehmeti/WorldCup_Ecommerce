/**
 * World Cup E-commerce Backend Server
 * Main entry point
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const mockRoutes = require('./routes/mock');
const agreementRoutes = require('./routes/agreement');
const adminRoutes = require('./routes/admin');
const valaGiftRoutes = require('./routes/valaGift');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.set('trust proxy', 1); // Trust first proxy (Nginx)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/vala-gifts', valaGiftRoutes);

// Mock routes (enable with ENABLE_MOCK_ROUTES=true)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_MOCK_ROUTES === 'true') {
  app.use('/mock', mockRoutes);
  console.log('📝 Mock routes enabled at /mock');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'World Cup E-commerce API',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Error Handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start Server ────────────────────────────────────────
const certPath = path.join(__dirname, '..', 'certs');
const hasSSL = fs.existsSync(path.join(certPath, 'key.pem')) && fs.existsSync(path.join(certPath, 'cert.pem'));

if (hasSSL && process.env.NODE_ENV !== 'production') {
  const sslOptions = {
    key: fs.readFileSync(path.join(certPath, 'key.pem')),
    cert: fs.readFileSync(path.join(certPath, 'cert.pem')),
  };
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`\n🏆 ══════════════════════════════════════════`);
    console.log(`🏆  World Cup E-commerce API`);
    console.log(`🏆  Running on https://localhost:${PORT}`);
    console.log(`🏆  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏆  SSL: ✅ Local HTTPS enabled`);
    console.log(`🏆 ══════════════════════════════════════════\n`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`\n🏆 ══════════════════════════════════════════`);
    console.log(`🏆  World Cup E-commerce API`);
    console.log(`🏆  Running on http://localhost:${PORT}`);
    console.log(`🏆  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏆 ══════════════════════════════════════════\n`);
  });
}
