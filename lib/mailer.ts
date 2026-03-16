// lib/mailer.ts — Gmail REST API (edge-compatible, no Nodemailer)

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

async function getGmailAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get Gmail access token: ${err}`);
  }

  const { access_token } = await response.json();
  return access_token;
}

function buildRawMessage(to: string, subject: string, html: string): string {
  const from = `"Eclipse Event Portal" <${process.env.EMAIL_USER}>`;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n');

  // base64url encode (works on Node.js and Cloudflare edge)
  const bytes = new TextEncoder().encode(message);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const accessToken = await getGmailAccessToken();
  const raw = buildRawMessage(to, subject, html);

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gmail API error: ${err}`);
  }
}

export const sendPendingRegistrationEmail = async (
  name: string,
  email: string,
  teamName: string
) => {
  const safeName = escapeHtml(name);
  const safeTeamName = escapeHtml(teamName);
  const html = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      <h2 style="color: #eab308; text-align: center; margin-bottom: 20px;">Registration Received</h2>
      <p style="color: #d1d5db; font-size: 16px;">Hi ${safeName},</p>
      <p style="color: #d1d5db; font-size: 16px;">We have successfully received the registration and payment receipt for your team <strong>${safeTeamName}</strong>.</p>

      <div style="background-color: #121212; border-left: 4px solid #eab308; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; color: #d1d5db; font-size: 15px; line-height: 1.6;">Our organizing team is currently verifying your payment receipt. <strong>Once approved, you and your team members will receive individual emails containing your Participant Hub login credentials.</strong></p>
      </div>

      <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; text-align: center;">Hold tight, and we'll be in touch soon!</p>
      <p style="color: #6b7280; font-size: 12px; text-align: center;">CodeChef PESU ECC Team</p>
    </div>
  `;

  try {
    await sendEmail(email, `Registration Pending Verification - ${teamName}`, html);
    console.log(`Pending email sent to leader: ${email}`);
  } catch (error) {
    console.error(`Failed to send pending email to ${email}:`, error);
    throw error;
  }
};

export const sendCredentialEmail = async (
  name: string,
  email: string,
  password: string,
  teamName: string,
  teamNumber: number,
  role: string
) => {
  const safeName = escapeHtml(name);
  const safeTeamName = escapeHtml(teamName);
  const safeRole = escapeHtml(role);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const formattedTeamNumber = teamNumber.toString().padStart(3, '0');

  const html = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      <h2 style="color: #06b6d4; text-align: center; margin-bottom: 20px;">Welcome to Eclipse!</h2>
      <p style="color: #d1d5db; font-size: 16px;">Hi ${safeName},</p>
      <p style="color: #d1d5db; font-size: 16px;">Your registration has been <strong>approved</strong>! You are officially registered for Eclipse as a <strong>${safeRole}</strong> of team <strong>${safeTeamName}</strong>.</p>

      <div style="background-color: #121212; border-left: 4px solid #06b6d4; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Participant Credentials</p>
        <p style="margin: 5px 0; font-size: 16px;"><strong>Team Number:</strong> <span style="color: #06b6d4; font-weight: bold;">#${formattedTeamNumber}</span></p>
        <p style="margin: 5px 0; font-size: 16px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin: 5px 0; font-size: 16px;"><strong>Password:</strong> <span style="color: #fbbf24; font-family: monospace; font-size: 18px;">${safePassword}</span></p>
      </div>

      <p style="color: #ef4444; font-size: 14px; font-weight: bold;">&#9888;&#65039; Keep this password safe. You will need it to log into the Participant Hub and generate your digital passes on the day of the event.</p>
      <p style="color: #d1d5db; font-size: 14px; font-weight: bold;">If your phone scanner fails, please provide your Team Number (#${formattedTeamNumber}) to the volunteer.</p>

      <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; text-align: center;">See you at the event!</p>
      <p style="color: #6b7280; font-size: 12px; text-align: center;">CodeChef PESU ECC Team</p>
    </div>
  `;

  try {
    await sendEmail(email, `Your Eclipse Participant Credentials - ${safeTeamName}`, html);
    console.log(`Credentials emailed to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    throw error;
  }
};

export const sendRejectionEmail = async (
  name: string,
  email: string,
  teamName: string,
  reason: string
) => {
  const safeName = escapeHtml(name);
  const safeTeamName = escapeHtml(teamName);
  const safeReason = escapeHtml(reason);
  const html = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      <h2 style="color: #ef4444; text-align: center; margin-bottom: 20px;">Registration Declined</h2>
      <p style="color: #d1d5db; font-size: 16px;">Hi ${safeName},</p>
      <p style="color: #d1d5db; font-size: 16px;">Unfortunately, we could not verify the payment receipt submitted for your team <strong>${safeTeamName}</strong>.</p>

      <div style="background-color: #121212; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reason provided by organizing team:</p>
        <p style="margin: 0; color: #f87171; font-size: 15px; font-style: italic;">"${safeReason}"</p>
      </div>

      <p style="color: #d1d5db; font-size: 14px; line-height: 1.6;">Your registration has been cancelled to free up the slot for other participants. If you believe this was an error, please reach out to the organizing team immediately or submit a new registration with a valid receipt.</p>

      <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; text-align: center;">CodeChef PESU ECC Team</p>
    </div>
  `;

  try {
    await sendEmail(email, `Update on your Eclipse Registration - ${safeTeamName}`, html);
    console.log(`Rejection email sent to leader: ${email}`);
  } catch (error) {
    console.error(`Failed to send rejection email to ${email}:`, error);
    throw error;
  }
};
