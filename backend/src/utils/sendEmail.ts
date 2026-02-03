import sgMail from '@sendgrid/mail';

// Cargar la API Key desde variables de entorno


const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (typeof SENDGRID_API_KEY !== 'string' || !SENDGRID_API_KEY.trim()) {
  throw new Error('Falta la variable de entorno SENDGRID_API_KEY');
}
if (typeof EMAIL_FROM !== 'string' || !EMAIL_FROM.trim()) {
  throw new Error('Falta la variable de entorno EMAIL_FROM');
}

const FROM_EMAIL: string = EMAIL_FROM;
sgMail.setApiKey(SENDGRID_API_KEY);

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}) {
  const msg: any = {
    to,
    from: FROM_EMAIL,
    subject,
  };
  if (typeof text === 'string') msg.text = text;
  if (typeof html === 'string') msg.html = html;
  await sgMail.send(msg);
}
