// Utilidad para mostrar notificaciones nativas
export function showNativeNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) {
        registration.showNotification(title, options);
      } else {
        // Fallback si no hay SW
        new Notification(title, options);
      }
    });
  } else {
    console.warn('No se puede mostrar la notificación: permisos no concedidos');
  }
}
