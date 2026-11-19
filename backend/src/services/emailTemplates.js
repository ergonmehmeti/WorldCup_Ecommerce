/**
 * Email Templates
 * All HTML & plain-text templates used by emailService.js
 */

function verificationEmail(firstName, code) {
  return {
    subject: 'Vala Botërori — Verifiko Emailin Tënd',
    text: `Përshëndetje ${firstName},\n\nKodi juaj i verifikimit është: ${code}\n\nKy kod skadon pas 15 minutash.\n\nMirë se vini në Vala Botërori!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; color: #1f2937; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h1 style="text-align: center; color: #7c3aed;">Vala Botërori</h1>
        <p>Përshëndetje <strong>${firstName}</strong>,</p>
        <p>Mirë se vini! Kodi juaj i verifikimit është:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; font-size: 40px; letter-spacing: 10px; font-weight: bold; color: #000000; background-color: #f3f0ff; padding: 15px 30px; border-radius: 8px; border: 2px solid #7c3aed;">${code}</div>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Ky kod skadon pas 15 minutash.</p>
        <hr style="border-color: #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center;">Tel: 080010000, web: www.kosovotelecom.com</p>
      </div>
    `,
  };
}

const VALA_PHONE_REGEX = /^(\+383|0)?(44|45|46)\d{6}$/;
function isValaPhone(phone) {
  if (!phone) return false;
  return VALA_PHONE_REGEX.test(phone.replace(/\s+/g, ''));
}

function formatValaPhone(phone) {
  if (!phone) return '';
  let p = phone.replace(/\s+/g, '');
  if (p.startsWith('+383')) p = p.slice(4);
  else if (p.startsWith('383')) p = p.slice(3);
  if (p.startsWith('0')) p = p.slice(1);
  return '0' + p;
}

function credentialsEmail(firstName, ottUsername, ottPassword, packageType, phone, mobilePackage = null) {
  const packageLabel = packageType === 'business' ? 'ValaBoterori_BIZ' : (mobilePackage ? `ValaBoterori + ${mobilePackage}` : 'ValaBoterori');
  const displayPhone = formatValaPhone(phone);
  
  // Mobile package message
  const mobilePackageMsg = mobilePackage
    ? `\n\nPakoja juaj mobile ${mobilePackage} do të aktivizohet brenda pak minutash ne numrin ${displayPhone}.`
    : '';
  const mobilePackageMsgHtml = mobilePackage
    ? `<div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">📱 Pakoja Mobile ${mobilePackage}</p>
          <p style="margin: 8px 0 0 0; color: #1f2937;">Pakoja juaj mobile <strong>${mobilePackage}</strong> do të aktivizohet brenda pak minutash ne numrin <strong>${displayPhone}</strong>.</p>
        </div>`
    : '';
  
  const valaMsg = isValaPhone(phone)
    ? `\n\nSi përdorues i Vala-s, keni përfituar edhe 104 GB FALAS qe vlejne per shikim te Boterorit në TV Vala. Pakoja do të aktivizohet automatikisht brenda ditës ne numrin ${displayPhone}.`
    : '';
  const valaMsgHtml = isValaPhone(phone)
    ? `<div style="background-color: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #15803d; font-weight: bold;">🎁 104 GB FALAS!</p>
          <p style="margin: 8px 0 0 0; color: #1f2937;">Si përdorues i Vala-s, keni përfituar edhe <strong>104 GB FALAS</strong> qe vlejne per shikim te Boterorit në TV Vala. Pakoja do të aktivizohet automatikisht brenda ditës ne numrin <strong>${displayPhone}</strong>.</p>
        </div>`
    : '';
  return {
    subject: `Vala Botërori | TV Vala — Kredencialet tuaja për ${packageLabel} janë gati!`,
    text: `Përshëndetje ${firstName},\n\nPagesa juaj për ${packageLabel} është konfirmuar! Këto janë kredencialet tuaja:\n\nPërdoruesi: ${ottUsername}\nFjalëkalimi: ${ottPassword}${mobilePackageMsg}${valaMsg}\n\nShkarkoni aplikacionin dhe filloni të shikoni!\n\nGëzuar Kupën e Botës!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; color: #1f2937; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h1 style="text-align: center; color: #7c3aed;">🎉 Jeni gati!</h1>
        <p>Përshëndetje <strong>${firstName}</strong>,</p>
        <p>Pagesa juaj për <strong>${packageLabel}</strong> është konfirmuar! Këto janë kredencialet tuaja:</p>
        <div style="background-color: #f3f0ff; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 5px 0; color: #7c3aed; font-weight: bold; font-size: 14px;">📦 ${packageLabel}</p>
          <p style="margin: 5px 0; color: #1f2937;"><strong style="color: #7c3aed;">Username:</strong> <span style="font-family: monospace; font-size: 16px; color: #1f2937;">${ottUsername}</span></p>
          <p style="margin: 5px 0; color: #1f2937;"><strong style="color: #db2777;">Password:</strong> <span style="font-family: monospace; font-size: 16px; color: #1f2937;">${ottPassword}</span></p>
        </div>
        ${mobilePackageMsgHtml}
        ${valaMsgHtml}
        <h3 style="color: #7c3aed;">📥 Shkarkoni Aplikacionin TV Vala:</h3>
        <ul style="color: #1f2937;">
          <li>Android: Google Play Store</li>
          <li>iOS: Apple App Store</li>
          <li>Smart TV: Kontrolloni app store</li>
        </ul>
        <hr style="border-color: #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center;">Tel: 080010000, web: www.kosovotelecom.com</p>
      </div>
    `,
  };
}

function paymentConfirmedEmail(firstName, packageType) {
  const packageLabel = packageType === 'business' ? 'ValaBoterori_BIZ' : 'ValaBoterori';
  return {
    subject: `Vala Botërori | TV Vala — Pagesa për ${packageLabel} u konfirmua!`,
    text: `Përshëndetje ${firstName},\n\nPagesa juaj për ${packageLabel} është konfirmuar!\n\nJemi duke konfiguruar llogarinë tuaj. Do t'i merrni kredencialet brenda 24 orëve.\n\nNëse nuk i merrni, ju lutem kontaktoni ekipin tonë.\n\nFaleminderit për durimin tuaj!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; color: #1f2937; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h1 style="text-align: center; color: #7c3aed;">💳 Pagesa u konfirmua!</h1>
        <p>Përshëndetje <strong>${firstName}</strong>,</p>
        <p>Pagesa juaj për <strong>${packageLabel}</strong> është konfirmuar me sukses!</p>
        <div style="background-color: #f3f0ff; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; color: #db2777; font-size: 16px;">🔄 Jemi duke konfiguruar llogarinë tuaj</p>
          <p style="margin: 10px 0 0 0; color: #1f2937;">Do t'i merrni kredencialet brenda <strong>24 orëve</strong>.</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Nëse nuk i merrni kredencialet, ju lutem kontaktoni ekipin tonë. Jemi këtu për t'ju ndihmuar!</p>
        <hr style="border-color: #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center;">Vala Botërori — TV Vala | Porta juaj drejt futbollit</p>
      </div>
    `,
  };
}

function passwordResetEmail(firstName, resetLink) {
  return {
    subject: 'Vala Botërori | TV Vala — Rivendos Fjalëkalimin',
    text: `Përshëndetje ${firstName},\n\nKemi marrë një kërkesë për rivendosjen e fjalëkalimit tuaj.\n\nKlikoni lidhjen më poshtë për të vendosur fjalëkalimin e ri (skadon pas 1 ore):\n${resetLink}\n\nNëse nuk e keni kërkuar këtë, mund ta injoroni këtë email me siguri.\n\nVala Botërori — TV Vala`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; color: #1f2937; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h1 style="text-align: center; color: #7c3aed;">🔑 Rivendos Fjalëkalimin</h1>
        <p style="color: #1f2937;">Përshëndetje <strong>${firstName}</strong>,</p>
        <p style="color: #1f2937;">Kemi marrë një kërkesë për rivendosjen e fjalëkalimit tuaj. Klikoni butonin më poshtë për të zgjedhur fjalëkalimin e ri:</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#7c3aed" style="border-radius: 8px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">Rivendos Fjalëkalimin</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 14px;">Kjo lidhje skadon pas <strong>1 ore</strong>.</p>
        <p style="color: #6b7280; font-size: 14px;">Nëse butoni nuk funksionon, kopjoni këtë lidhje në shfletuesin tuaj:</p>
        <p style="color: #7c3aed; font-size: 13px; word-break: break-all;">${resetLink}</p>
        <p style="color: #6b7280; font-size: 14px;">Nëse nuk e keni kërkuar këtë, mund ta injoroni këtë email me siguri.</p>
        <hr style="border-color: #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center;">Tel: 080010000, web: www.kosovotelecom.com</p>
      </div>
    `,
  };
}

module.exports = {
  verificationEmail,
  credentialsEmail,
  paymentConfirmedEmail,
  passwordResetEmail,
};
