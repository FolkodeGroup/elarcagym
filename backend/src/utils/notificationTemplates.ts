// Plantillas de mensajes para notificaciones administrativas

export function getCriticalErrorEmail({ error, module, datetime }: { error: string; module: string; datetime: string }) {
  return {
    subject: '🚨 Error crítico en el sistema El Arca Gym Manager',
    text: `Hola,\nSe ha detectado un error crítico en el sistema.\n\nDetalles del error:\n- Fecha y hora: ${datetime}\n- Descripción: ${error}\n- Módulo: ${module}\n\nPor favor, revisa el sistema lo antes posible.`
  };
}

export function getSensitiveConfigChangeEmail({ param, oldValue, newValue, user, datetime }: { param: string; oldValue: string; newValue: string; user: string; datetime: string }) {
  return {
    subject: '⚠️ Cambio en configuración sensible',
    text: `Hola,\nUn usuario ha realizado un cambio en la configuración sensible del sistema.\n\nDetalles del cambio:\n- Parámetro modificado: ${param}\n- Valor anterior: ${oldValue}\n- Nuevo valor: ${newValue}\n- Usuario responsable: ${user}\n- Fecha y hora: ${datetime}`
  };
}

export function getNewMemberEmail({ name, email, datetime }: { name: string; email: string; datetime: string }) {
  return {
    subject: '🆕 Nuevo socio registrado',
    text: `Hola,\nSe ha registrado un nuevo socio en el sistema.\n\nDetalles del socio:\n- Nombre: ${name}\n- Email: ${email}\n- Fecha de alta: ${datetime}`
  };
}

export function getMembershipExpiredEmail({ name, email, expiredAt }: { name: string; email: string; expiredAt: string }) {
  return {
    subject: '⏰ Socio con membresía vencida',
    text: `Hola,\nUno o más socios tienen la membresía vencida.\n\nDetalles:\n- Nombre: ${name}\n- Email: ${email}\n- Fecha de vencimiento: ${expiredAt}`
  };
}

export function getRoleChangeEmail({ affectedUser, oldRole, newRole, changedBy, datetime }: { affectedUser: string; oldRole: string; newRole: string; changedBy: string; datetime: string }) {
  return {
    subject: '🔑 Cambio de rol o permisos de usuario',
    text: `Hola,\nSe ha realizado un cambio de rol o permisos en un usuario.\n\nDetalles:\n- Usuario afectado: ${affectedUser}\n- Rol anterior: ${oldRole}\n- Nuevo rol: ${newRole}\n- Usuario responsable: ${changedBy}\n- Fecha y hora: ${datetime}`
  };
}
