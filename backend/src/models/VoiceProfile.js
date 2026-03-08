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
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        voice_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'My Voice',
            comment: 'User-given name for this voice clone',
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
        use_for_outgoing: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Use this voice when sending payments',
        },
        use_for_incoming: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Use this voice when receiving payments',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Master on/off toggle for this voice',
        },
        outgoing_message: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: 'Payment sent successfully!',
            comment: 'Custom TTS message when sending payments',
        },
        incoming_message: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: 'You received a payment!',
            comment: 'Custom TTS message when receiving payments',
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
