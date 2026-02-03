import { Router } from 'express';
import multer from 'multer';

export default function(prisma: any) {
  const router = Router();

  // Obtener todas las configuraciones
  router.get('/', async (req, res) => {
    try {
      const configs = await prisma.config.findMany();
      res.json(configs);
    } catch (e) {
      console.error('Error en export-excel:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener una configuración por key
  router.get('/:key', async (req, res) => {
    try {
      const config = await prisma.config.findUnique({
        where: { key: req.params.key }
      });
      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      res.json(config);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Crear o actualizar una configuración
  router.put('/:key', async (req, res) => {
    try {
      const { value, description } = req.body;
      const config = await prisma.config.upsert({
        where: { key: req.params.key },
        update: { value, description },
        create: { key: req.params.key, value, description }
      });
      res.json(config);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar una configuración
  router.delete('/:key', async (req, res) => {
    try {
      await prisma.config.delete({ where: { key: req.params.key } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Configuración de multer para subir archivos Excel
  const upload = multer({ storage: multer.memoryStorage() });

  // Exportar respaldo completo en formato Excel
    // Importar respaldo desde archivo Excel
    router.post('/backup/import-excel', upload.single('file'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No se recibió archivo.' });
        }
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        // Procesar cada hoja
        const importResults: any = {};
        for (const sheetName of workbook.SheetNames) {
          const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          // Insertar/actualizar según la hoja
          if (sheetName === 'Miembros') {
            for (const member of data) {
              await prisma.member.upsert({
                where: { id: member.id },
                update: member,
                create: member
              });
            }
            importResults['Miembros'] = data.length;
          } else if (sheetName === 'Productos') {
            for (const product of data) {
              await prisma.product.upsert({
                where: { id: product.id },
                update: product,
                create: product
              });
            }
            importResults['Productos'] = data.length;
          } else if (sheetName === 'Ventas') {
            for (const sale of data) {
              await prisma.sale.upsert({
                where: { id: sale.id },
                update: sale,
                create: sale
              });
            }
            importResults['Ventas'] = data.length;
          } else if (sheetName === 'Reservas') {
            for (const reservation of data) {
              await prisma.reservation.upsert({
                where: { id: reservation.id },
                update: reservation,
                create: reservation
              });
            }
            importResults['Reservas'] = data.length;
          }
        }
        res.json({ message: 'Importación completada', importResults });
      } catch (e) {
        res.status(500).json({ error: (e as Error).message });
      }
    });
  router.get('/backup/export-excel', async (req, res) => {
    try {
      console.log('Iniciando exportación de respaldo Excel...');
      
      // Función para truncar campos de texto largos (límite de Excel: 32767 caracteres)
      const truncateData = (data: any[]) => {
        const MAX_CELL_LENGTH = 32000; // Dejamos margen de seguridad
        return data.map(item => {
          const truncated: any = {};
          for (const key in item) {
            let value = item[key];
            // Convertir objetos/arrays a JSON string
            if (value !== null && typeof value === 'object') {
              value = JSON.stringify(value);
            }
            // Truncar strings largos
            if (typeof value === 'string' && value.length > MAX_CELL_LENGTH) {
              truncated[key] = value.substring(0, MAX_CELL_LENGTH) + '... [TRUNCADO]';
            } else {
              truncated[key] = value;
            }
          }
          return truncated;
        });
      };

      // Obtener datos principales
      console.log('Consultando miembros...');
      const members = await prisma.member.findMany();
      console.log('Miembros consultados:', members.length);
      console.log('Consultando productos...');
      const products = await prisma.product.findMany();
      console.log('Productos consultados:', products.length);
      console.log('Consultando ventas...');
      const sales = await prisma.sale.findMany();
      console.log('Ventas consultadas:', sales.length);
      console.log('Consultando reservas...');
      const reservations = await prisma.reservation.findMany();
      console.log('Reservas consultadas:', reservations.length);

      // Truncar datos largos
      console.log('Procesando datos para Excel...');
      const truncatedMembers = truncateData(members);
      const truncatedProducts = truncateData(products);
      const truncatedSales = truncateData(sales);
      const truncatedReservations = truncateData(reservations);

      // Preparar workbook
      console.log('Creando workbook...');
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      wb.Props = { Title: 'Respaldo Completo El Arca Gym', Author: 'Sistema El Arca Gym', CreatedDate: new Date() };

      // Convertir cada entidad a hoja
      console.log('Agregando hojas al workbook...');
      wb.SheetNames.push('Miembros');
      wb.Sheets['Miembros'] = XLSX.utils.json_to_sheet(truncatedMembers);
      wb.SheetNames.push('Productos');
      wb.Sheets['Productos'] = XLSX.utils.json_to_sheet(truncatedProducts);
      wb.SheetNames.push('Ventas');
      wb.Sheets['Ventas'] = XLSX.utils.json_to_sheet(truncatedSales);
      wb.SheetNames.push('Reservas');
      wb.Sheets['Reservas'] = XLSX.utils.json_to_sheet(truncatedReservations);

      // Generar archivo Excel en memoria
      console.log('Generando buffer de Excel...');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      console.log('Buffer generado, tamaño:', buffer.length);
      res.setHeader('Content-Disposition', 'attachment; filename="respaldo-el-arca-gym.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      console.log('Enviando archivo Excel al cliente...');
      res.send(buffer);
      console.log('Exportación completada exitosamente.');
    } catch (e) {
      console.error('Error en export-excel:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
