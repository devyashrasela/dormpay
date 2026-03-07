const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        auth0_sub: {
            type: DataTypes.STRING(128),
            allowNull: false,
            unique: true,
            comment: 'Auth0 user ID (sub claim)',
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                is: /^[a-zA-Z0-9_]+$/i,
                len: [3, 50],
            },
        },
        wallet_address: {
            type: DataTypes.STRING(58),
            unique: true,
            allowNull: true,
            comment: 'Algorand address, set after Pera Wallet connect',
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: { isEmail: true },
        },
        display_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        avatar_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'true when user has the app open',
        },
        last_active: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'users',
        timestamps: true,
        underscored: true,
    });

    User.associate = (models) => {
        User.hasMany(models.Transaction, { as: 'sentTransactions', foreignKey: 'sender_user_id' });
        User.hasMany(models.Transaction, { as: 'receivedTransactions', foreignKey: 'receiver_user_id' });
        User.hasMany(models.SplitBill, { foreignKey: 'creator_id' });
        User.hasMany(models.SplitBillParticipant, { foreignKey: 'user_id' });
        User.hasMany(models.SplitBillExpense, { foreignKey: 'paid_by_user_id' });
        User.hasMany(models.Notification, { foreignKey: 'user_id' });
        User.hasMany(models.ChatHistory, { foreignKey: 'user_id' });
        User.hasOne(models.VoiceProfile, { foreignKey: 'user_id' });
    };





    return User;
};
