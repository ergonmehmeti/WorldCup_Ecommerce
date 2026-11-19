/**
 * Email Service
 * Handles sending verification codes, OTT credentials, and other emails.
 * Templates are imported from emailTemplates.js
 */
const nodemailer = require('nodemailer');
const templates = require('./emailTemplates');

// Create transporter — in dev mode or when EMAIL_MOCK_MODE is enabled, use a mock/console logger
let transporter;

if (process.env.NODE_ENV === 'production' && process.env.EMAIL_MOCK_MODE !== 'true') {
  const transportConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    ignoreTLS: true,
    requireTLS: false,
    tls: {
      rejectUnauthorized: false
    }
  };

  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    transportConfig.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    };
  }

  transporter = nodemailer.createTransport(transportConfig);
} else {
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('\n📧 ══════════════════════════════════════');
      console.log('📧  MOCK EMAIL SENT');
      console.log('📧 ══════════════════════════════════════');
      console.log(`📧  To:      ${mailOptions.to}`);
      console.log(`📧  Subject: ${mailOptions.subject}`);
      console.log(`📧  Body:    ${mailOptions.text || '(HTML email)'}`);
      if (mailOptions.html) {
        const codeMatch = mailOptions.html.match(/\b\d{6}\b/);
        if (codeMatch) {
          console.log(`📧  CODE:    ${codeMatch[0]}`);
        }
      }
      console.log('📧 ══════════════════════════════════════\n');
      return { messageId: 'mock-' + Date.now() };
    },
  };
}

const DEFAULT_FROM = process.env.EMAIL_FROM || '"Vala Botërori" <noreply@worldcuptv.com>';

/**
 * Helper: send with retry logic
 */
async function sendWithRetry(mailOptions, label, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ ${label} sent successfully to ${mailOptions.to} (attempt ${attempt})`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send ${label} (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) {
        console.error(`💥 All email send attempts failed for ${label}.`);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function sendVerificationEmail(email, firstName, code) {
  const { subject, text, html } = templates.verificationEmail(firstName, code);
  return transporter.sendMail({ from: DEFAULT_FROM, to: email, subject, text, html });
}

async function sendCredentialsEmail(email, firstName, ottUsername, ottPassword, packageType = 'personal', phone = null, mobilePackage = null, retries = 3) {
  const { subject, text, html } = templates.credentialsEmail(firstName, ottUsername, ottPassword, packageType, phone, mobilePackage);
  return sendWithRetry({ from: DEFAULT_FROM, to: email, subject, text, html }, 'Credentials email', retries);
}

async function sendPaymentConfirmedEmail(email, firstName, packageType = 'personal', retries = 3) {
  const { subject, text, html } = templates.paymentConfirmedEmail(firstName, packageType);
  return sendWithRetry({ from: DEFAULT_FROM, to: email, subject, text, html }, 'Payment confirmed email', retries);
}

async function sendPasswordResetEmail(email, firstName, resetLink) {
  const { subject, text, html } = templates.passwordResetEmail(firstName, resetLink);
  return transporter.sendMail({ from: DEFAULT_FROM, to: email, subject, text, html });
}

/**
 * Send email with an attachment (used by VALA gift XML export)
 */
async function sendEmailWithAttachment(to, subject, body, attachment, retries = 3) {
  const mailOptions = {
    from: DEFAULT_FROM,
    to,
    subject,
    text: body,
    attachments: [attachment],
  };
  return sendWithRetry(mailOptions, 'Attachment email', retries);
}

/**
 * Send a simple text email (used for cron heartbeat)
 */
async function sendHeartbeatEmail(to, subject, body, retries = 2) {
  const mailOptions = {
    from: DEFAULT_FROM,
    to,
    subject,
    text: body,
  };
  return sendWithRetry(mailOptions, 'Heartbeat email', retries);
}

module.exports = { sendVerificationEmail, sendCredentialsEmail, sendPaymentConfirmedEmail, sendPasswordResetEmail, sendEmailWithAttachment, sendHeartbeatEmail };
