const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'CampusWallet <noreply@campuswallet.com>',
            to,
            subject,
            html,
        });
        console.log('Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Email send failed:', error.message);
        throw error;
    }
};

module.exports = { transporter, sendEmail };
