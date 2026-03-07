const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        dialectOptions: dbConfig.dialectOptions || {},
        logging: dbConfig.logging || false,
        define: dbConfig.define || {},
        pool: dbConfig.pool || {},
    }
);

const db = {};

// Import all models
const User = require('./User')(sequelize);
const Transaction = require('./Transaction')(sequelize);
const SplitBill = require('./SplitBill')(sequelize);
const SplitBillParticipant = require('./SplitBillParticipant')(sequelize);
const SplitBillExpense = require('./SplitBillExpense')(sequelize);
const Notification = require('./Notification')(sequelize);
const ChatHistory = require('./ChatHistory')(sequelize);
const VoiceProfile = require('./VoiceProfile')(sequelize);

db.User = User;
db.Transaction = Transaction;
db.SplitBill = SplitBill;
db.SplitBillParticipant = SplitBillParticipant;
db.SplitBillExpense = SplitBillExpense;
db.Notification = Notification;
db.ChatHistory = ChatHistory;
db.VoiceProfile = VoiceProfile;

// Run associations
Object.values(db).forEach((model) => {
    if (model.associate) {
        model.associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
