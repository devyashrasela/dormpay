require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Load SSL CA certificate if path is provided
let dialectOptions = {};
if (process.env.DB_CA_CERT_PATH) {
    const caPath = path.resolve(__dirname, '..', '..', process.env.DB_CA_CERT_PATH);
    if (fs.existsSync(caPath)) {
        dialectOptions = {
            ssl: {
                ca: fs.readFileSync(caPath, 'utf8'),
                rejectUnauthorized: true,
            },
        };
        console.log('✅ SSL CA certificate loaded for database connection');
    } else {
        console.warn('⚠️  DB_CA_CERT_PATH set but file not found:', caPath);
    }
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
            max: 20,
            min: 5,
            acquire: 30000,
            idle: 10000,
        },
    },
};
