const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Transaction = sequelize.define('Transaction', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        txn_id: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            comment: 'Algorand transaction ID',
        },
        sender_user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        receiver_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL',
        },
        sender_address: {
            type: DataTypes.STRING(58),
            allowNull: false,
        },
        receiver_address: {
            type: DataTypes.STRING(58),
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(20, 6),
            allowNull: false,
        },
        asset_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'ALGO',
        },
        asset_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: '0 = native ALGO',
        },
        note: {
            type: DataTypes.STRING(1024),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
            allowNull: false,
            defaultValue: 'pending',
        },
        block_round: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Algorand block round when confirmed',
        },
    }, {
        tableName: 'transactions',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['sender_user_id'] },
            { fields: ['receiver_user_id'] },
            { fields: ['status'] },
            { fields: ['created_at'] },
        ],
    });

    Transaction.associate = (models) => {
        Transaction.belongsTo(models.User, { as: 'sender', foreignKey: 'sender_user_id' });
        Transaction.belongsTo(models.User, { as: 'receiver', foreignKey: 'receiver_user_id' });
    };

    return Transaction;
};
