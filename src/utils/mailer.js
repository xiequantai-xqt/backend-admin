const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false';

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendEmail = async ({ to, subject, text, html }) => {
  const isMock = String(process.env.SMTP_MOCK || '').toLowerCase() === 'true';
  const isDev = process.env.NODE_ENV !== 'production';
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (isMock || (isDev && !hasSmtp)) {
    return { mock: true, to, subject };
  }

  if (!hasSmtp) {
    throw new Error('SMTP configuration missing');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = createTransporter();
  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

module.exports = { sendEmail };
