# Estructura del Proyecto El Arca Gym

Este proyecto está organizado siguiendo buenas prácticas de arquitectura para aplicaciones Node.js/Fullstack modernas con Docker.

## Estructura de carpetas

```
/
├── .github/                # Workflows y configuración de GitHub Actions
├── backend/                # Código fuente del backend (API, servicios, etc.)
├── frontend/               # Código fuente del frontend (React, Vite, etc.)
├── nginx/                  # Configuración de Nginx para producción
├── docs/                   # Documentación y guías del proyecto
├── scripts/                # Scripts de mantenimiento y backups
├── .gitignore              # Exclusiones de git
├── docker-compose.yml      # Orquestador de contenedores Docker
├── deploy.sh               # Script principal de despliegue
```

## Descripción de carpetas principales

- **backend/**: Todo el código y configuración del backend (Node.js, Express, Prisma, etc.)
- **frontend/**: Todo el código y configuración del frontend (React, Vite, etc.)
- **nginx/**: Archivos de configuración de Nginx para servir la app y manejar SSL.
- **docs/**: Manuales, guías de despliegue, arquitectura, checklist, etc.
- **scripts/**: Scripts de limpieza, backup, restauración y mantenimiento.

## Archivos clave en la raíz

- **docker-compose.yml**: Orquestador de todos los servicios y contenedores.
- **deploy.sh**: Script automatizado para setup y despliegue en el VPS.
- **.gitignore**: Exclusiones para el control de versiones.

---

Para más detalles, revisa la carpeta `docs/`.
