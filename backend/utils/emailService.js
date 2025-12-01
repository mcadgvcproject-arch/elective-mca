import nodemailer from 'nodemailer';

// Cache the transporter to avoid creating a new one for each email
let cachedTransporter = null;

const initializeTransporter = async () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  try {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await cachedTransporter.verify();
    console.log('Email service connected successfully');
    return cachedTransporter;
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!to) throw new Error('Recipient email (to) is required');
    if (!subject) throw new Error('Email subject is required');

    const emailTransporter = await initializeTransporter();
    if (!emailTransporter) {
        console.log('Email transporter not initialized. Email would have been sent to:', to);
        return { error: true, message: 'Email service unavailable' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text: text || '',
      html: html || '',
    };

    console.log(`Sending email to ${to} with subject: ${subject}`);
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    return { error: true, message: error.message };
  }
};

export default { sendEmail };
