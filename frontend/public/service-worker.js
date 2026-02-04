self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Aquí puedes manejar la acción al hacer click en la notificación
});

// Puedes agregar más lógica para manejar push en el futuro
