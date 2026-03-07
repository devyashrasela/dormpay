const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const VoiceProfile = sequelize.define('VoiceProfile', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        elevenlabs_voice_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'ElevenLabs cloned voice ID',
        },
        sample_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'Path to stored voice sample audio file',
        },
        voice_on_send: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Play voice when sending payments',
        },
        voice_on_pay: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Play voice when settling split bills',
        },
    }, {
        tableName: 'voice_profiles',
        timestamps: true,
        underscored: true,
    });

    VoiceProfile.associate = (models) => {
        VoiceProfile.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return VoiceProfile;
};
