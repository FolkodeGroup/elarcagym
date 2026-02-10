import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export default function(prisma: any) {
  const router = Router();

  // ==================== AUTENTICACIÓN DE USUARIOS ====================

  /**
   * @swagger
   * /users/login:
   *   post:
   *     summary: Login de usuario (admin/trainer)
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login exitoso
   *       401:
   *         description: Credenciales inválidas
   */
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: 'Usuario desactivado. Contacte al administrador.' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Actualizar último login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Extraer códigos de permisos
      const permissions = user.permissions
        .filter((up: any) => up.granted)
        .map((up: any) => up.permission.code);

      // Generar token con información del usuario
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          permissions
        },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          photoUrl: user.photoUrl,
          permissions
        }
      });
    } catch (e) {
      console.error('Error en login:', e);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // ==================== CRUD DE USUARIOS ====================

  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Listar todos los usuarios
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de usuarios
   */
  router.get('/', async (req: any, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          dni: true,
          phone: true,
          role: true,
          isActive: true,
          photoUrl: true,
          createdAt: true,
          lastLoginAt: true,
          permissions: {
            include: {
              permission: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Mapear para incluir array de permisos
      const usersWithPermissions = users.map((user: any) => ({
        ...user,
        permissions: user.permissions
          .filter((up: any) => up.granted)
          .map((up: any) => up.permission.code)
      }));

      res.json(usersWithPermissions);
    } catch (e) {
      console.error('Error listando usuarios:', e);
        res.status(500).json({ error: 'Error al obtener usuarios' });
      }
    });

  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Obtener usuario por ID
   *     tags: [Users]
   */
  router.get('/:id', async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          dni: true,
          phone: true,
          role: true,
          isActive: true,
          photoUrl: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        ...user,
        permissions: user.permissions
          .filter((up: any) => up.granted)
          .map((up: any) => up.permission.code)
      });
    } catch (e) {
      console.error('Error obteniendo usuario:', e);
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  });

  /**
   * @swagger
   * /users:
   *   post:
   *     summary: Crear nuevo usuario
   *     tags: [Users]
   */
  router.post('/', authenticateToken, async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, dni, phone, role, permissions, photoUrl } = req.body;

      if (!email || !password || !firstName || !lastName || !dni) {
        return res.status(400).json({ error: 'Faltan campos requeridos: email, password, firstName, lastName, dni' });
      }

      // Verificar que el usuario actual es admin
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden crear usuarios' });
      }

      // Verificar email y DNI únicos
      const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (existingEmail) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }

      const existingDni = await prisma.user.findUnique({ where: { dni } });
      if (existingDni) {
        return res.status(409).json({ error: 'El DNI ya está registrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          firstName,
          lastName,
          dni,
          phone,
          role: role || 'TRAINER',
          photoUrl,
          isActive: true
        }
      });

      // Permisos por defecto para TRAINER
      const TRAINER_DEFAULT_PERMISSIONS = [
        'members.view',
        'routines.view', 'routines.create', 'routines.edit', 'routines.delete',
        'biometrics.view', 'biometrics.create', 'biometrics.edit',
        'nutrition.view', 'nutrition.create', 'nutrition.edit',
        'reservations.view', 'reservations.create',
        'exercises.view',
        'dashboard.view',
      ];

      // Determinar qué permisos asignar
      const effectiveRole = role || 'TRAINER';
      let permsToAssignCodes: string[] = [];
      
      if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        // Si se proporcionan permisos explícitos, usarlos
        permsToAssignCodes = permissions;
      } else if (effectiveRole === 'TRAINER') {
        // Si es TRAINER y no se proporcionan permisos, asignar los de defecto
        permsToAssignCodes = TRAINER_DEFAULT_PERMISSIONS;
      }
      
      if (permsToAssignCodes.length > 0) {
        const permsToAssign = await prisma.permission.findMany({
          where: { code: { in: permsToAssignCodes } }
        });

        for (const perm of permsToAssign) {
          await prisma.userPermission.create({
            data: {
              userId: user.id,
              permissionId: perm.id,
              granted: true
            }
          });
        }
      }

      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });
    } catch (e) {
      console.error('Error creando usuario:', e);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  });

  /**
   * @swagger
   * /users/{id}:
   *   put:
   *     summary: Actualizar usuario
   *     tags: [Users]
   */
  router.put('/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { email, password, firstName, lastName, dni, phone, role, isActive, permissions, photoUrl } = req.body;

      // Verificar que el usuario actual es admin o es el mismo usuario
      const isAdmin = req.user?.role === 'ADMIN';
      const isSelf = req.user?.id === id;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ error: 'No tienes permiso para editar este usuario' });
      }

      // Solo admin puede cambiar rol y estado
      if (!isAdmin && (role || isActive !== undefined)) {
        return res.status(403).json({ error: 'Solo los administradores pueden cambiar rol o estado' });
      }

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar email único (si se cambia)
      if (email && email.toLowerCase().trim() !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (emailExists) {
          return res.status(409).json({ error: 'El email ya está en uso' });
        }
      }

      // Verificar DNI único (si se cambia)
      if (dni && dni !== existingUser.dni) {
        const dniExists = await prisma.user.findUnique({ where: { dni } });
        if (dniExists) {
          return res.status(409).json({ error: 'El DNI ya está en uso' });
        }
      }

      // Preparar datos de actualización
      const updateData: any = {};
      if (email) updateData.email = email.toLowerCase().trim();
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (dni) updateData.dni = dni;
      if (phone !== undefined) updateData.phone = phone;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
      if (isAdmin) {
        if (role) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
      }
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          dni: true,
          phone: true,
          role: true,
          isActive: true,
          photoUrl: true
        }
      });

      // Actualizar permisos si es admin y se proporcionan
      if (isAdmin && permissions && Array.isArray(permissions)) {
        // Eliminar permisos actuales
        await prisma.userPermission.deleteMany({ where: { userId: id } });

        // Asignar nuevos permisos
        const permsToAssign = await prisma.permission.findMany({
          where: { code: { in: permissions } }
        });

        for (const perm of permsToAssign) {
          await prisma.userPermission.create({
            data: {
              userId: id,
              permissionId: perm.id,
              granted: true
            }
          });
        }
      }

      res.json(user);
    } catch (e) {
      console.error('Error actualizando usuario:', e);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  });

  /**
   * @swagger
   * /users/{id}:
   *   delete:
   *     summary: Eliminar usuario
   *     tags: [Users]
   */
  router.delete('/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Solo admin puede eliminar
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden eliminar usuarios' });
      }

      // No permitir auto-eliminación
      if (req.user?.id === id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      await prisma.user.delete({ where: { id } });
      res.status(204).send();
    } catch (e) {
      console.error('Error eliminando usuario:', e);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });

  // ==================== GESTIÓN DE PERMISOS ====================

  /**
   * @swagger
   * /users/permissions/all:
   *   get:
   *     summary: Listar todos los permisos disponibles
   *     tags: [Users]
   */
  router.get('/permissions/all', async (_req: any, res) => {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { name: 'asc' }]
      });

      // Agrupar por módulo
      const grouped = permissions.reduce((acc: any, perm: any) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      }, {});

      res.json({ permissions, grouped });
    } catch (e) {
      console.error('Error listando permisos:', e);
      res.status(500).json({ error: 'Error al obtener permisos' });
    }
  });

  /**
   * @swagger
   * /users/{id}/permissions:
   *   put:
   *     summary: Actualizar permisos de un usuario
   *     tags: [Users]
   */
  router.put('/:id/permissions', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body; // Array de códigos de permisos

      // LOG PARA DEPURAR
      console.log('Usuario autenticado en permisos:', req.user);

      // Solo admin puede modificar permisos
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden modificar permisos' });
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: 'permissions debe ser un array de códigos de permisos' });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Eliminar permisos actuales
      await prisma.userPermission.deleteMany({ where: { userId: id } });

      // Asignar nuevos permisos
      const permsToAssign = await prisma.permission.findMany({
        where: { code: { in: permissions } }
      });

      for (const perm of permsToAssign) {
        await prisma.userPermission.create({
          data: {
            userId: id,
            permissionId: perm.id,
            granted: true
          }
        });
      }

      res.json({ message: 'Permisos actualizados', permissions });
    } catch (e) {
      console.error('Error actualizando permisos:', e);
      res.status(500).json({ error: 'Error al actualizar permisos' });
    }
  });

  // ==================== PERFIL DEL USUARIO ACTUAL ====================

  /**
   * @swagger
   * /users/me/profile:
   *   get:
   *     summary: Obtener perfil del usuario actual
   *     tags: [Users]
   */
  router.get('/me/profile', authenticateToken, async (req: any, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          dni: true,
          phone: true,
          role: true,
          photoUrl: true,
          createdAt: true,
          lastLoginAt: true,
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        ...user,
        permissions: user.permissions
          .filter((up: any) => up.granted)
          .map((up: any) => up.permission.code)
      });
    } catch (e) {
      console.error('Error obteniendo perfil:', e);
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  });

  /**
   * @swagger
   * /users/me/password:
   *   put:
   *     summary: Cambiar contraseña del usuario actual
   *     tags: [Users]
   */
  router.put('/me/password', async (req: any, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Se requiere contraseña actual y nueva' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword }
      });

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (e) {
      console.error('Error cambiando contraseña:', e);
      res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
  });

  return router;
}
