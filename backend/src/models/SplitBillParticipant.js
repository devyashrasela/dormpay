const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SplitBillParticipant = sequelize.define('SplitBillParticipant', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        split_bill_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'split_bills', key: 'id' },
            onDelete: 'CASCADE',
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        is_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'true = can add members; creator is auto-admin',
        },
        share_amount: {
            type: DataTypes.DECIMAL(20, 6),
            allowNull: false,
            defaultValue: 0,
        },
        paid_amount: {
            type: DataTypes.DECIMAL(20, 6),
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM('pending', 'partial', 'paid'),
            allowNull: false,
            defaultValue: 'pending',
        },
    }, {
        tableName: 'split_bill_participants',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['split_bill_id', 'user_id'],
                name: 'unique_participant_per_bill',
            },
        ],
    });

    SplitBillParticipant.associate = (models) => {
        SplitBillParticipant.belongsTo(models.SplitBill, { foreignKey: 'split_bill_id' });
        SplitBillParticipant.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return SplitBillParticipant;
};
