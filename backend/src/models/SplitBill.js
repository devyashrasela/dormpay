const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SplitBill = sequelize.define('SplitBill', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        creator_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        total_amount: {
            type: DataTypes.DECIMAL(20, 6),
            allowNull: false,
        },
        asset_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'ALGO',
        },
        status: {
            type: DataTypes.ENUM('active', 'settled', 'cancelled'),
            allowNull: false,
            defaultValue: 'active',
        },
    }, {
        tableName: 'split_bills',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['creator_id'] },
            { fields: ['status'] },
        ],
    });

    SplitBill.associate = (models) => {
        SplitBill.belongsTo(models.User, { as: 'creator', foreignKey: 'creator_id' });
        SplitBill.hasMany(models.SplitBillParticipant, { as: 'participants', foreignKey: 'split_bill_id' });
        SplitBill.hasMany(models.SplitBillExpense, { as: 'expenses', foreignKey: 'split_bill_id' });
    };

    return SplitBill;
};
