const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Notification = sequelize.define('Notification', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        type: {
            type: DataTypes.ENUM('payment_received', 'payment_sent', 'split_invite', 'split_settled'),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        message: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        reference_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Polymorphic: txn ID, split bill ID, etc.',
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        email_sent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'true if email notification was dispatched',
        },
    }, {
        tableName: 'notifications',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['is_read'] },
            { fields: ['type'] },
            { fields: ['created_at'] },
        ],
    });

    Notification.associate = (models) => {
        Notification.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return Notification;
};
