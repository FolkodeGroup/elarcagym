import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Terms: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('terminosServicio')}</h1>
      <p className="text-sm text-gray-300 mb-4">Última actualización: Febrero 2026</p>
      <div className="prose text-sm text-gray-200">
        <h2>1. Introducción</h2>
        <p>Bienvenido a El Arca Gym Manager. Al utilizar nuestros servicios usted acepta estos Términos de Servicio ("Términos"). Si no está de acuerdo con alguno de los términos, no utilice nuestros servicios.</p>

        <h2>2. Servicios</h2>
        <p>Proporcionamos una plataforma para la gestión de gimnasios, incluyendo administración de socios, reservas, pagos y comunicaciones. Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte de los servicios en cualquier momento.</p>

        <h2>3. Cuentas y acceso</h2>
        <p>Para usar ciertas funciones deberá crear una cuenta. Usted es responsable de mantener la confidencialidad de sus credenciales y de todas las actividades que ocurran bajo su cuenta.</p>

        <h2>4. Uso aceptable</h2>
        <p>Usted se compromete a no utilizar los servicios para actividades ilegales o que infrinjan los derechos de terceros. Nos reservamos el derecho de suspender cuentas que violen nuestras políticas.</p>

        <h2>5. Propiedad intelectual</h2>
        <p>Todos los derechos sobre el software, marcas, contenidos y documentación pertenecen a El Arca Gym o sus licenciantes. No está permitido copiar, distribuir o crear obras derivadas sin autorización previa.</p>

        <h2>6. Limitación de responsabilidad</h2>
        <p>En la máxima medida permitida por la ley, El Arca Gym no será responsable por daños indirectos, especiales, incidentales o consecuentes que surjan del uso o imposibilidad de usar los servicios.</p>

        <h2>7. Modificaciones de los Términos</h2>
        <p>Podemos actualizar estos Términos ocasionalmente. Publicaremos la versión actualizada y la fecha de entrada en vigor. El uso continuo del servicio después de los cambios constituye su aceptación.</p>

        <h2>8. Terminación</h2>
        <p>Podemos suspender o cancelar su acceso si incumple estos Términos o por cualquier otra razón a nuestra discreción.</p>

        <h2>9. Ley aplicable y jurisdicción</h2>
        <p>Estos Términos se regirán por las leyes aplicables del país donde opere El Arca Gym y cualquier disputa será sometida a los tribunales competentes.</p>

        <h2>10. Contacto</h2>
        <p>Si tiene preguntas acerca de estos Términos, póngase en contacto con nosotros a través del responsable de la plataforma.</p>

        <p className="mt-4 text-sm text-gray-400">Este texto es una plantilla informativa y no sustituye asesoramiento legal profesional. Recomendamos revisarlo con su asesor legal antes de publicarlo.</p>
      </div> 
    </div>
  );
};

export default Terms;
