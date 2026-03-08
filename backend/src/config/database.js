require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Load SSL CA certificate
let dialectOptions = {};

// Option 1: Load cert content directly from env var (best for serverless)
if (process.env.DB_CA_CERT) {
    try {
        const certContent = Buffer.from(process.env.DB_CA_CERT, 'base64').toString('utf8');
        dialectOptions = {
            ssl: {
                ca: certContent,
                rejectUnauthorized: true,
            },
        };
        console.log('✅ SSL CA certificate loaded from DB_CA_CERT env var');
    } catch (err) {
        console.warn('⚠️  Failed to decode DB_CA_CERT:', err.message);
    }
}

// Option 2: Load cert from file path
if (!dialectOptions.ssl && process.env.DB_CA_CERT_PATH) {
    // Try multiple possible paths for serverless compatibility
    const possiblePaths = [
        path.resolve(__dirname, '..', '..', process.env.DB_CA_CERT_PATH),
        path.resolve(process.cwd(), process.env.DB_CA_CERT_PATH),
        path.resolve('/var/task/backend', process.env.DB_CA_CERT_PATH),
        process.env.DB_CA_CERT_PATH,
    ];

    let caContent = null;
    for (const caPath of possiblePaths) {
        if (fs.existsSync(caPath)) {
            caContent = fs.readFileSync(caPath, 'utf8');
            console.log('✅ SSL CA certificate loaded from:', caPath);
            break;
        }
    }

    if (caContent) {
        dialectOptions = {
            ssl: {
                ca: caContent,
                rejectUnauthorized: true,
            },
        };
    } else {
        console.warn('⚠️  DB_CA_CERT_PATH set but file not found in any expected location');
        console.warn('   Tried:', possiblePaths.join(', '));
    }
}

// Fallback: enable SSL without CA cert (works with Aiven and most cloud DBs)
if (!dialectOptions.ssl && (process.env.DB_SSL === 'true' || process.env.DB_HOST)) {
    dialectOptions = {
        ssl: {
            rejectUnauthorized: false,
        },
    };
    console.log('✅ SSL enabled for database connection (no CA cert, rejectUnauthorized=false)');
}

const sharedDefine = {
    timestamps: true,
    underscored: true,
    paranoid: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
};

module.exports = {
    development: {
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'campus_wallet',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        dialect: 'mysql',
        dialectOptions,
        logging: console.log,
        define: sharedDefine,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    },
    test: {
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: (process.env.DB_NAME || 'campus_wallet') + '_test',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        dialect: 'mysql',
        dialectOptions,
        logging: false,
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        dialect: 'mysql',
        dialectOptions,
        logging: false,
        define: sharedDefine,
        pool: {
            max: 2,       // Serverless: keep very low — each function gets its own pool
            min: 0,       // Release all idle connections immediately
            acquire: 10000,
            idle: 0,      // Close idle connections right away
            evict: 5000,  // Check for idle connections every 5s
        },
    },
};
