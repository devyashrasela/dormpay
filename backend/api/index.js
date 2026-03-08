// Explicit require so Vercel's bundler includes mysql2 (Sequelize loads it dynamically)
require('mysql2');

const app = require('../src/server');
const db = require('../src/models');

// Initialize database connection for serverless
let dbInitialized = false;

module.exports = async (req, res) => {
    if (!dbInitialized) {
        try {
            await db.sequelize.authenticate();
            await db.sequelize.sync();
            dbInitialized = true;
        } catch (error) {
            console.error('DB init error:', error.message);
            console.error('DB init stack:', error.stack);
            return res.status(500).json({
                error: 'Database initialization failed',
                message: error.message,
                hint: 'Check that DB environment variables are set in Vercel dashboard'
            });
        }
    }
    return app(req, res);
};
