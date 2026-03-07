require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const db = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

        // Sync models (creates tables if not exist)
        // await db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        // console.log('✅ Database synced');

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

startServer();

module.exports = app;
