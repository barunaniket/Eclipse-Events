import { serverEnv } from '@/lib/env';

const sendEmail = async (to: string, subject: string, html: string) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serverEnv.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: serverEnv.emailFrom,
      to,
      subject,
      html,
      reply_to: serverEnv.emailUser,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email delivery failed: ${errorText}`);
  }
};

export const sendPendingRegistrationEmail = async (
  name: string,
  email: string,
  teamName: string
) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      <h2 style="color: #eab308; text-align: center; margin-bottom: 20px;">Registration Received</h2>
      <p style="color: #d1d5db; font-size: 16px;">Hi ${name},</p>
      <p style="color: #d1d5db; font-size: 16px;">We have successfully received the registration and payment receipt for your team <strong>${teamName}</strong>.</p>
      
      <div style="background-color: #121212; border-left: 4px solid #eab308; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; color: #d1d5db; font-size: 15px; line-height: 1.6;">Our organizing team is currently verifying your payment receipt. <strong>Once approved, you and your team members will receive secure account activation links for the Participant Hub.</strong></p>
      </div>
      
      <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; text-align: center;">Hold tight, and we'll be in touch soon!</p>
      <p style="color: #6b7280; font-size: 12px; text-align: center;">CodeChef PESU ECC Team</p>
    </div>
  `;

  try {
    await sendEmail(email, `Registration Pending Verification - ${teamName}`, htmlTemplate);
    console.log(`Pending email sent to leader: ${email}`);
  } catch (error) {
    console.error(`Failed to send pending email to ${email}:`, error);
    throw error;
  }
};

export const sendCredentialEmail = async (
  name: string,
  email: string,
  onboardingLink: string,
  teamName: string,
  teamNumber: number,
  role: string
) => {
  const formattedTeamNumber = teamNumber.toString().padStart(3, '0');

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      <h2 style="color: #06b6d4; text-align: center; margin-bottom: 20px;">Welcome to Eclipse!</h2>
      <p style="color: #d1d5db; font-size: 16px;">Hi ${name},</p>
      <p style="color: #d1d5db; font-size: 16px;">Your registration has been <strong>approved</strong>! You are officially registered for Eclipse as a <strong>${role}</strong> of team <strong>${teamName}</strong>.</p>
      
      <div style="background-color: #121212; border-left: 4px solid #06b6d4; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Activate Your Participant Account</p>
        <p style="margin: 5px 0; font-size: 16px;"><strong>Team Number:</strong> <span style="color: #06b6d4; font-weight: bold;">#${formattedTeamNumber}</span></p>
        <p style="margin: 5px 0; font-size: 16px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 16px 0 0 0;"><a href="${onboardingLink}" style="display: inline-block; background: #06b6d4; color: #050505; text-decoration: none; font-weight: bold; padding: 12px 18px; border-radius: 10px;">Set Your Password</a></p>
      </div>
      
      <p style="color: #ef4444; font-size: 14px; font-weight: bold;">⚠️ This activation link is sensitive. Use it once to set your password before event day.</p>
      <p style="color: #d1d5db; font-size: 14px; font-weight: bold;">If your phone scanner fails, please provide your Team Number (#${formattedTeamNumber}) to the volunteer.</p>
      
      <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; text-align: center;">See you at the event!</p>
      <p style="color: #6b7280; font-size: 12px; text-align: center;">CodeChef PESU ECC Team</p>
    </div>
  `;

  try {
    await sendEmail(email, `Your Eclipse Participant Credentials - ${teamName}`, htmlTemplate);
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
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      <h2 style="color: #ef4444; text-align: center; margin-bottom: 20px;">Registration Declined</h2>
      <p style="color: #d1d5db; font-size: 16px;">Hi ${name},</p>
      <p style="color: #d1d5db; font-size: 16px;">Unfortunately, we could not verify the payment receipt submitted for your team <strong>${teamName}</strong>.</p>
      
      <div style="background-color: #121212; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reason provided by organizing team:</p>
        <p style="margin: 0; color: #f87171; font-size: 15px; font-style: italic;">"${reason}"</p>
      </div>
      
      <p style="color: #d1d5db; font-size: 14px; line-height: 1.6;">Your registration has been cancelled to free up the slot for other participants. If you believe this was an error, please reach out to the organizing team immediately or submit a new registration with a valid receipt.</p>
      
      <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; text-align: center;">CodeChef PESU ECC Team</p>
    </div>
  `;

  try {
    await sendEmail(email, `Update on your Eclipse Registration - ${teamName}`, htmlTemplate);
    console.log(`Rejection email sent to leader: ${email}`);
  } catch (error) {
    console.error(`Failed to send rejection email to ${email}:`, error);
    throw error;
  }
};
