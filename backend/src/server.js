require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const db = require('./models');

const app = express();
const PORT = process.env.PORT || 8000;

// ──────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
            .split(',')
            .map(s => s.trim());
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded voice samples
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ──────────────────────────────────────────
// Routes
// ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
const userRoutes = require('./routes/user.routes');
const walletRoutes = require('./routes/wallet.routes');
const transactionRoutes = require('./routes/transaction.routes');
const splitBillRoutes = require('./routes/splitBill.routes');
const notificationRoutes = require('./routes/notification.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const chatRoutes = require('./routes/chat.routes');
const voiceRoutes = require('./routes/voice.routes');

app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/split-bills', splitBillRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);

// ──────────────────────────────────────────
// Swagger API Docs
// ──────────────────────────────────────────
const { setupSwagger } = require('./config/swagger');
setupSwagger(app);

// ──────────────────────────────────────────
// Error handling
// ──────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({ error: 'Invalid or missing authentication token' });
    }

    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
});

// ──────────────────────────────────────────
// Start server
// ──────────────────────────────────────────
const startServer = async () => {
    try {
        // Test database connection
        await db.sequelize.authenticate();
        console.log('✅ Database connection established');

        // Sync models (creates tables if they don't exist)
        await db.sequelize.sync();
        console.log('✅ Database synced');

        // Migrate voice_profiles: add new columns if missing
        const qi = db.sequelize.getQueryInterface();
        const vpCols = await qi.describeTable('voice_profiles').catch(() => null);
        if (vpCols && !vpCols.voice_name) {
            console.log('🔄 Migrating voice_profiles table...');
            await db.sequelize.query(`ALTER TABLE voice_profiles
              ADD COLUMN voice_name VARCHAR(255) DEFAULT 'My Voice',
              ADD COLUMN use_for_outgoing TINYINT(1) DEFAULT 0,
              ADD COLUMN use_for_incoming TINYINT(1) DEFAULT 0,
              ADD COLUMN is_active TINYINT(1) DEFAULT 1`);
            // Drop old columns if they exist
            if (vpCols.voice_on_send) {
                await db.sequelize.query(`ALTER TABLE voice_profiles DROP COLUMN voice_on_send, DROP COLUMN voice_on_pay`);
            }
            // Drop unique constraint on user_id if it exists
            try {
                await db.sequelize.query(`ALTER TABLE voice_profiles DROP INDEX user_id`);
            } catch (e) { /* index may not exist */ }
            console.log('✅ voice_profiles migration complete');
        }
        // Add custom message columns if missing
        const vpCols2 = await qi.describeTable('voice_profiles').catch(() => null);
        if (vpCols2 && !vpCols2.outgoing_message) {
            console.log('🔄 Adding message columns to voice_profiles...');
            await db.sequelize.query(`ALTER TABLE voice_profiles
              ADD COLUMN outgoing_message VARCHAR(500) DEFAULT 'Payment sent successfully!',
              ADD COLUMN incoming_message VARCHAR(500) DEFAULT 'You received a payment!'`);
            console.log('✅ Message columns added');
        }

        app.listen(PORT, () => {
            console.log(`🚀 Campus Wallet API running on http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};
// Only start the server if NOT running as a Vercel serverless function
if (!process.env.VERCEL) {
    startServer();
}

module.exports = app;
