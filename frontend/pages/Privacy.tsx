import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Privacy: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('politicaPrivacidad')}</h1>
      <p className="text-sm text-gray-300 mb-4">Última actualización: Febrero 2026</p>
      <div className="prose text-sm text-gray-200">
        <h2>1. Introducción</h2>
        <p>En El Arca Gym nos tomamos en serio la privacidad. Esta Política explica qué datos recopilamos, por qué lo hacemos y cómo los protegemos.</p>

        <h2>2. Datos que recopilamos</h2>
        <ul>
          <li><strong>Datos de identificación:</strong> nombre, correo electrónico, teléfono, documento de identidad.</li>
          <li><strong>Datos de uso:</strong> historial de reservas, clases, pagos y actividad dentro de la plataforma.</li>
          <li><strong>Datos técnicos:</strong> dirección IP, información del dispositivo y cookies.</li>
        </ul>

        <h2>3. Finalidades del tratamiento</h2>
        <p>Usamos sus datos para: (a) prestar y mejorar la plataforma; (b) gestionar cuentas, reservas y pagos; (c) comunicar novedades y notificaciones relevantes; (d) cumplir obligaciones legales.</p>

        <h2>4. Bases legales</h2>
        <p>Tratamos sus datos sobre la base de su consentimiento, la ejecución de un contrato, el cumplimiento de obligaciones legales y nuestros intereses legítimos (por ejemplo, seguridad y mejora del servicio).</p>

        <h2>5. Compartir datos</h2>
        <p>No vendemos sus datos. Podemos compartir información con proveedores que nos ayudan a operar la plataforma (por ejemplo, procesadores de pago, servicios de hosting) y cuando la ley lo requiera.</p>

        <h2>6. Cookies y tecnologías similares</h2>
        <p>Utilizamos cookies para mejorar la experiencia, gestionar sesiones y analizar el uso de la plataforma. Puede ajustar sus preferencias de cookies en su navegador.</p>

        <h2>7. Seguridad y retención</h2>
        <p>Adoptamos medidas técnicas y organizativas para proteger sus datos. Conservaremos los datos durante el tiempo necesario para cumplir las finalidades descritas y conforme a las obligaciones legales aplicables.</p>

        <h2>8. Derechos de los usuarios</h2>
        <p>Usted puede ejercer derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad. Para solicitarlos, póngase en contacto con el responsable de la plataforma.</p>

        <h2>9. Transferencias internacionales</h2>
        <p>Si transferimos datos fuera del país de residencia, nos aseguraremos de que existan salvaguardias adecuadas para protegerlos.</p>

        <h2>10. Cambios en la política</h2>
        <p>Podemos actualizar esta Política. Publicaremos la versión revisada con la fecha de actualización. El uso continuado de la plataforma implica la aceptación de la Política actualizada.</p>

        <h2>11. Contacto</h2>
        <p>Para consultas sobre privacidad o para ejercer sus derechos, contacte con el responsable de la plataforma.</p>

        <p className="mt-4 text-sm text-gray-400">Este documento es una plantilla informativa. Para cumplimiento legal específico, consulte con su asesoría o responsable de protección de datos.</p>
      </div>
    </div>
  );
};

export default Privacy;
