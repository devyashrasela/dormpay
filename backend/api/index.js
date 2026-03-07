const app = require('./src/server');
const db = require('./src/models');

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
        }
    }
    return app(req, res);
};
