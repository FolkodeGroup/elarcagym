# Documentación del Sistema de Gestión – El Arcagym

## Tabla de Contenido
1. [Introducción](#introducción)
2. [Alcance y Objetivos](#alcance-y-objetivos)
3. [Requisitos](#requisitos)
4. [Requerimientos Funcionales](#requerimientos-funcionales)
5. [Requerimientos No Funcionales](#requerimientos-no-funcionales)
6. [Arquitectura y Diseño](#arquitectura-y-diseño)
7. [Base de Datos Privada](#base-de-datos-privada)
8. [Registro Biométrico](#registro-biométrico)
9. [Gestión de Horarios](#gestión-de-horarios)
10. [Rutinas y Dietas](#rutinas-y-dietas)
11. [Filtro Administrativo](#filtro-administrativo)
12. [Interfaz y APB](#interfaz-y-apb)
13. [Instagram del Cliente](#instagram-del-cliente)
14. [Instalación y Despliegue](#instalación-y-despliegue)
15. [Uso y Ejemplos](#uso-y-ejemplos)
16. [Mantenimiento y Soporte](#mantenimiento-y-soporte)

---

## Introducción
En la actualidad, la gestión eficiente de la información es un pilar fundamental para el crecimiento de cualquier institución deportiva. El gimnasio "El Arcagym" se encuentra en un proceso de transformación digital, buscando dejar atrás los registros manuales y dispersos para centralizar la información de sus socios y operaciones diarias.

El presente proyecto, desarrollado por el equipo de soluciones tecnológicas FOLKODE, tiene como finalidad el diseño y desarrollo de un sistema de software integral y personalizado. Este sistema nace de la necesidad de optimizar el control de los progresos físicos de los clientes, administrar sus planes de entrenamiento y nutrición, y mantener un monitoreo claro del estado financiero de cada cuenta.

A través de una interfaz gráfica intuitiva y robusta, se busca facilitar la tarea de los entrenadores y administradores, permitiéndoles enfocar su tiempo en la atención al cliente en lugar de la gestión de papeles, garantizando al mismo tiempo la privacidad y seguridad de los datos sensibles de los socios.

## Alcance y Objetivos
### Alcance
El sistema desarrollado por FOLKODE abarcará las siguientes funcionalidades y módulos:
- Gestión de usuarios (socios)
- Seguimiento físico (bio-métrica)
- Operativo (entrenamiento y nutrición)
- Administrativo y reportes
- Interfaz y seguridad

### Objetivos
- Digitalizar el seguimiento físico
- Gestionar planes personalizados
- Controlar el flujo administrativo
- Garantizar la usabilidad (APB)
- Asegurar la información

## Requisitos
### Requerimientos Funcionales
- Alta, baja y modificación de datos personales de los clientes
- Gestión de horarios de asistencia
- Registro de fichas de control (peso, estatura, medidas, fechas)
- Visualización de historial
- Creación y asignación de rutinas y dietas
- Filtrado de clientes por estado de cuenta
- Registro de consumiciones adicionales
- Login de acceso para personal

### Requerimientos No Funcionales
- Rendimiento óptimo en equipos estándar
- Seguridad y privacidad de datos
- Usabilidad y accesibilidad (APB)
- Base de datos alojada y privada

## Arquitectura y Diseño

### Recomendaciones para el desarrollo

#### Frontend
- **React.js** (con Vite para desarrollo rápido y moderno)
- **TypeScript** (tipado fuerte, mantenibilidad y escalabilidad)
- **Material UI** o **Chakra UI** (componentes accesibles y visualmente atractivos)
- **Zustand** o **Redux Toolkit** (gestión de estado eficiente)
- **React Query** (manejo de datos remotos y caché)
- **Zod** o **Yup** (validaciones de formularios y datos)
- **Axios** (comunicación HTTP)
- **Testing:** React Testing Library y Vitest

#### Backend
- **Node.js** con **Express.js** (API REST robusta y escalable)
- **TypeScript** (seguridad y mantenibilidad)
- **Prisma ORM** (acceso seguro y eficiente a la base de datos)
- **PostgreSQL** (base de datos relacional, segura y escalable)
- **JWT** y **bcrypt** (autenticación y seguridad de contraseñas)
- **Testing:** Jest y Supertest

#### DevOps y Calidad
- **GitHub Actions** (CI/CD automatizado)
- **ESLint** y **Prettier** (calidad y formato de código)
- **Husky** (pre-commits y hooks)
- **Swagger/OpenAPI** (documentación automática de la API)

#### Estructura recomendada de carpetas
- `/src/frontend` – Código fuente del cliente (React)
- `/src/backend` – Código fuente del servidor (Node.js/Express)
- `/prisma` – Esquemas y migraciones de base de datos
- `/docs` – Documentación técnica y manuales
- `/tests` – Pruebas unitarias y de integración

#### Buenas prácticas
- Usar tipado fuerte en todo el proyecto (TypeScript)
- Validar todos los datos recibidos y enviados
- Implementar control de errores y logs
- Mantener la documentación actualizada
- Realizar pruebas automatizadas para cada módulo

#### Diagrama general
Se recomienda un diagrama de arquitectura tipo "cliente-servidor":

```
 [React Frontend] <--> [Express API Backend] <--> [PostgreSQL DB]
```

El frontend consume la API REST, que gestiona la lógica y el acceso seguro a la base de datos alojada (servidor o nube).

---

**Nota para desarrolladores:**
Priorizar la seguridad, la usabilidad y la mantenibilidad. Usar las tecnologías recomendadas para asegurar un sistema moderno, escalable y fácil de mantener. Documentar cada endpoint y componente, y realizar pruebas exhaustivas antes de cada despliegue.

---

## Base de Datos Privada

La base de datos del sistema es completamente privada y alojada en un servidor seguro (puede ser en la nube o en un hosting dedicado). Esto garantiza que la información de los clientes no sea accesible públicamente ni por terceros no autorizados. Se implementan controles de acceso mediante credenciales para el personal autorizado, y se realizan respaldos periódicos para evitar pérdida de información. Los datos sensibles (como métricas físicas y estados financieros) están cifrados y protegidos contra accesos no autorizados.

**Ventajas:**
- Seguridad y privacidad de los datos personales y biométricos
- Cumplimiento de normativas de protección de datos
- Acceso restringido solo al personal autorizado

**Recomendaciones:**
- Realizar copias de seguridad periódicas
- Mantener las credenciales seguras y actualizadas
- No compartir el acceso fuera del personal autorizado

---

## Registro Biométrico

El sistema permite registrar y consultar la evolución física de cada cliente mediante fichas de control con fecha. Los datos almacenados incluyen:
- **Peso:** Valor en kilogramos.
- **Estatura:** Valor en centímetros.
- **Medidas corporales:** Circunferencia de cintura, cadera, brazo, pierna, etc.
- **Fecha de control:** Cada registro queda asociado a una fecha específica.

**Ejemplo de uso:**  
Al ingresar un nuevo control, el sistema solicita los valores y la fecha, permitiendo visualizar el historial y evolución del cliente en gráficos o tablas.

## Gestión de Horarios

Cada cliente puede tener horarios preferentes de asistencia registrados en el sistema. Esto permite:
- Asignar y modificar horarios según disponibilidad.
- Visualizar los horarios de todos los clientes para una mejor organización.
- Generar reportes de asistencia.

**Ejemplo de uso:**  
El administrador selecciona el cliente y define los días y horas de asistencia, que quedan registrados y pueden ser consultados por el personal.

## Rutinas y Dietas

El sistema incluye apartados para:
- **Rutinas de entrenamiento:** Creación y asignación de rutinas personalizadas por cliente, con ejercicios, series y repeticiones.
- **Dietas o planes alimenticios:** Asignación de dietas específicas, con detalle de comidas y suplementos recomendados.

**Ejemplo de uso:**  
El entrenador selecciona al cliente, crea una rutina y/o dieta, y la asigna para su seguimiento. El historial de rutinas y dietas queda disponible para consulta.

## Filtro Administrativo

El módulo administrativo permite filtrar y gestionar cuentas de clientes:
- **Clientes al día:** Visualización de clientes con pagos actualizados.
- **Clientes morosos:** Identificación de deudores y generación de alertas.
- **Consumiciones adicionales:** Registro de suplementos, bebidas y merchandising adquiridos por cada cliente.

**Ejemplo de uso:**  
El sistema muestra un listado filtrado por estado de cuenta, permitiendo acciones como enviar recordatorios o registrar nuevas consumiciones.

## Interfaz y APB

La interfaz está diseñada bajo principios de Alta Usabilidad (APB):
- Botones grandes y claros.
- Textos legibles y validaciones para evitar errores.
- Navegación intuitiva y minimalista.
- Accesible para usuarios sin experiencia técnica.

## Instagram del Cliente
Instagram oficial: [@elarcagym](https://www.instagram.com/elarcagym/)

## Instalación y Despliegue

**Prerrequisitos:**
- Sistema operativo compatible (Windows/Linux/Mac)
- [Especificar dependencias: Python, Node.js, etc.]

**Pasos de instalación:**
1. Descargar el paquete del sistema.
2. Instalar dependencias con el comando correspondiente.
3. Configurar credenciales de acceso.
4. Ejecutar el sistema.

**Despliegue:**
- Local (PC del gimnasio)
- Opcional: Red interna para acceso desde varias terminales

## Uso y Ejemplos

**Ejemplo básico:**  
Registrar un nuevo cliente, asignar rutina y dieta, registrar control biométrico y consultar estado de cuenta.

**Ejemplo avanzado:**  
Generar reportes de evolución física, filtrar clientes morosos y exportar datos para análisis.

## Mantenimiento y Soporte

**Mantenimiento:**
- Actualizaciones periódicas del sistema.
- Respaldo automático de la base de datos.
- Soporte técnico vía correo o WhatsApp.

**Reporte de errores:**
Enviar descripción y capturas a contactofolkode@gmail.com
