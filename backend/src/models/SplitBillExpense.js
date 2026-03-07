const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SplitBillExpense = sequelize.define('SplitBillExpense', {
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
        paid_by_user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: false,
            comment: 'e.g., Pizza, Drinks, Cab fare',
        },
        amount: {
            type: DataTypes.DECIMAL(20, 6),
            allowNull: false,
        },
        txn_id: {
            type: DataTypes.STRING(64),
            allowNull: true,
            comment: 'Algorand txn ID if settled on-chain',
        },
    }, {
        tableName: 'split_bill_expenses',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['split_bill_id'] },
            { fields: ['paid_by_user_id'] },
        ],
    });

    SplitBillExpense.associate = (models) => {
        SplitBillExpense.belongsTo(models.SplitBill, { foreignKey: 'split_bill_id' });
        SplitBillExpense.belongsTo(models.User, { as: 'paidBy', foreignKey: 'paid_by_user_id' });
    };

    return SplitBillExpense;
};
