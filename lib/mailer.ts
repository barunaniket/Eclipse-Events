// lib/mailer.ts
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendCredentialEmail = async (
  name: string,
  email: string,
  password: string,
  teamName: string,
  role: string
) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      <h2 style="color: #06b6d4; text-align: center; margin-bottom: 20px;">Welcome to Eclipse!</h2>
      <p style="color: #d1d5db; font-size: 16px;">Hi ${name},</p>
      <p style="color: #d1d5db; font-size: 16px;">You have successfully been registered for the Eclipse event as a <strong>${role}</strong> of team <strong>${teamName}</strong>.</p>
      
      <div style="background-color: #121212; border-left: 4px solid #06b6d4; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Participant Credentials</p>
        <p style="margin: 5px 0; font-size: 16px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0; font-size: 16px;"><strong>Password:</strong> <span style="color: #fbbf24; font-family: monospace; font-size: 18px;">${password}</span></p>
      </div>
      
      <p style="color: #ef4444; font-size: 14px; font-weight: bold;">⚠️ Keep this password safe. You will need it to log into the Participant Hub and generate your digital passes on the day of the event.</p>
      
      <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; text-align: center;">See you at the event!</p>
      <p style="color: #6b7280; font-size: 12px; text-align: center;">CodeChef PESU ECC Team</p>
    </div>
  `;

  const mailOptions = {
    from: `"Eclipse Event Portal" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your Eclipse Participant Credentials - ${teamName}`,
    html: htmlTemplate,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Credentials emailed to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    throw error;
  }
};