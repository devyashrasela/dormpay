const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ChatHistory = sequelize.define('ChatHistory', {
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
        role: {
            type: DataTypes.ENUM('user', 'assistant'),
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    }, {
        tableName: 'chat_histories',
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['created_at'] },
        ],
    });

    ChatHistory.associate = (models) => {
        ChatHistory.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return ChatHistory;
};
