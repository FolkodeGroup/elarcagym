// Script de prueba para envío de email
import { sendEmail } from './utils/sendEmail.js';

async function main() {
  try {
    await sendEmail({
      to: 'admin@tu-dominio.com',
      subject: 'Prueba de notificación',
      text: '¡Este es un email de prueba desde el sistema El Arca Gym Manager!'
    });
    console.log('Email enviado correctamente');
  } catch (error) {
    console.error('Error enviando email:', error);
  }
}

main();
