# Autenticación JWT y Protección de Rutas

## Descripción
Se implementó autenticación basada en JWT para el backend de El Arca Gym Manager. Esto permite registrar usuarios (miembros), iniciar sesión y proteger rutas sensibles para que solo usuarios autenticados puedan acceder.

## Paquetes utilizados
- `jsonwebtoken`: generación y verificación de tokens JWT
- `bcryptjs`: hash seguro de contraseñas
- `tsx`: ejecución de TypeScript con soporte ES Modules

## Endpoints principales

### Registro de usuario
`POST /auth/register`
```json
{
  "email": "usuario@ejemplo.com",
  "password": "tu_password",
  "firstName": "Nombre",
  "lastName": "Apellido",
  "dni": "12345678",
  "phone": "123456789",
  "status": "activo",
  "phase": "inicio"
}
```
Respuesta:
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com"
}
```

### Login de usuario
`POST /auth/login`
```json
{
  "email": "usuario@ejemplo.com",
  "password": "tu_password"
}
```
Respuesta:
```json
{
  "token": "<JWT>"
}
```

### Acceso a rutas protegidas
Ejemplo: `GET /members`

Debes enviar el header:
```
Authorization: Bearer <JWT>
```
Si el token es válido, accedes a la información. Si no, recibes error 401 o 403.

## Ejemplo con curl
```bash
# Registro
curl -X POST http://localhost:4000/auth/register -H "Content-Type: application/json" -d '{"email":"usuario@ejemplo.com","password":"tu_password","firstName":"Nombre","lastName":"Apellido","dni":"12345678","phone":"123456789","status":"activo","phase":"inicio"}'

# Login
curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d '{"email":"usuario@ejemplo.com","password":"tu_password"}'

# Acceso protegido
curl -X GET http://localhost:4000/members -H "Authorization: Bearer <JWT>"
```

## Errores comunes
- `401 Token requerido`: No enviaste el header Authorization
- `403 Token inválido`: El token está mal formado o expirado
- `409 El email ya está registrado`: Intentas registrar un email existente
- `400 Credenciales inválidas`: Email o password incorrectos

## Detalles técnicos
- El campo `password` se almacena hasheado en la base de datos
- El token JWT expira en 8 horas
- Puedes proteger cualquier ruta agregando el middleware `authenticateToken`

## Archivos modificados
- `src/controllers/authController.ts`: endpoints de login y registro
- `src/middleware/auth.ts`: middleware de autenticación
- `src/index.ts`: integración de rutas y protección
- `prisma/schema.prisma`: campo password y email único

---

Para dudas o ampliaciones, consulta la documentación Swagger en `/api-docs`.
