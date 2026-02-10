# Sistema de Recomendaciones Nutricionales - Documentación

## Descripción
Sistema completo para gestionar recomendaciones nutricionales que se incluyen automáticamente en los PDFs de planes nutricionales de los socios.

## Características Implementadas

### Backend
1. **Modelo de Base de Datos** (`NutritionTemplate`)
   - `id`: Identificador único
   - `title`: Título de la sección de recomendaciones
   - `content`: Contenido de las recomendaciones (texto plano)
   - `isActive`: Indica si la plantilla está activa (solo una puede estar activa a la vez)
   - `createdAt`: Fecha de creación
   - `updatedAt`: Fecha de última actualización

2. **Endpoints API** (`/api/nutrition-templates`)
   - `GET /nutrition-templates/active` - Obtener plantilla activa
   - `GET /nutrition-templates` - Listar todas las plantillas
   - `GET /nutrition-templates/:id` - Obtener una plantilla específica
   - `POST /nutrition-templates` - Crear nueva plantilla
   - `PUT /nutrition-templates/:id` - Actualizar plantilla
   - `DELETE /nutrition-templates/:id` - Eliminar plantilla

### Frontend
1. **API Service** (`NutritionTemplatesAPI`)
   - Funciones para consultar y gestionar plantillas

2. **Interfaz de Usuario** (Página de Nutrición)
   - Botón "Configurar Recomendaciones" en el encabezado
   - Modal para editar título y contenido de recomendaciones
   - Guardado automático con validación

3. **Generación de PDF**
   - Inclusión automática de recomendaciones al final del PDF
   - Nueva página dedicada con formato profesional
   - Detección automática de títulos y párrafos
   - Manejo de líneas largas con word-wrap

## Uso

### Configurar Recomendaciones
1. Ir a la página "Nutrición"
2. Hacer clic en el botón "Configurar Recomendaciones"
3. Editar el título y contenido
4. Hacer clic en "Guardar Recomendaciones"

### Generar PDF con Recomendaciones
1. Seleccionar un socio en la página "Socios"
2. Generar el PDF de nutrición
3. Las recomendaciones se incluirán automáticamente al final del PDF

## Contenido por Defecto
Las recomendaciones incluyen:
- Opciones de infusiones
- Verduras mixtas
- Condimentos
- Consejos importantes
- Horarios de comidas

## Notas Técnicas
- Solo una plantilla puede estar activa a la vez
- Al activar una nueva plantilla, las anteriores se desactivan automáticamente
- El contenido se guarda en texto plano con saltos de línea
- Los títulos se detectan automáticamente (texto en mayúsculas)
