import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Search,
  X,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  User,
  Mail,
  Phone,
  CreditCard,
  Lock,
  Save
} from 'lucide-react';
import { UsersAPI, SystemUser, Permission } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Mapeo de nombres de módulos a español
const MODULE_NAMES: Record<string, string> = {
  members: 'Socios',
  routines: 'Rutinas',
  biometrics: 'Biometría',
  nutrition: 'Nutrición',
  reservations: 'Reservas',
  products: 'Productos',
  sales: 'Ventas',
  payments: 'Pagos',
  reminders: 'Recordatorios',
  exercises: 'Ejercicios',
  config: 'Configuración',
  users: 'Usuarios',
  dashboard: 'Dashboard',
  reports: 'Reportes',
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Administrador', color: 'bg-purple-500' },
  TRAINER: { label: 'Profesor', color: 'bg-blue-500' },
};

const UsersManagement: React.FC = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [allPermissions, setAllPermissions] = useState<{ permissions: Permission[]; grouped: Record<string, Permission[]> }>({ permissions: [], grouped: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  // Resetear showPassword al abrir/cerrar modal
  useEffect(() => {
    setShowPassword(false);
  }, [showUserModal]);
  const [editingUser, setEditingUser] = useState<Partial<SystemUser & { password?: string }>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, permsData] = await Promise.all([
        UsersAPI.list(),
        UsersAPI.getAllPermissions()
      ]);
      setUsers(usersData);
      setAllPermissions(permsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setEditingUser({
      role: 'TRAINER',
      isActive: true,
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user: SystemUser) => {
    setSelectedUser(user);
    setEditingUser({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      dni: user.dni,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      photoUrl: user.photoUrl,
    });
    setShowUserModal(true);
  };

  const handleManagePermissions = (user: SystemUser) => {
    setSelectedUser(user);
    setSelectedPermissions([...user.permissions]);
    setExpandedModules(Object.keys(allPermissions.grouped));
    setShowPermissionsModal(true);
  };

  const handleDeleteUser = (user: SystemUser) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await UsersAPI.delete(selectedUser.id);
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser.email || !editingUser.firstName || !editingUser.lastName || !editingUser.dni) {
      setError('Todos los campos requeridos deben completarse');
      return;
    }

    if (!selectedUser && !editingUser.password) {
      setError('La contraseña es requerida para nuevos usuarios');
      return;
    }

    setSaving(true);
    try {
      if (selectedUser) {
        // Actualizar usuario existente
        const updated = await UsersAPI.update(selectedUser.id, editingUser);
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...updated } : u));
      } else {
        // Crear nuevo usuario
        const created = await UsersAPI.create(editingUser as any);
        await loadData(); // Recargar para obtener datos completos
      }
      setShowUserModal(false);
      setSelectedUser(null);
      setEditingUser({});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await UsersAPI.updatePermissions(selectedUser.id, selectedPermissions);
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, permissions: selectedPermissions }
          : u
      ));
      setShowPermissionsModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (code: string) => {
    setSelectedPermissions(prev => 
      prev.includes(code) 
        ? prev.filter(p => p !== code)
        : [...prev, code]
    );
  };

  const toggleModule = (module: string) => {
    setExpandedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  const toggleAllModulePermissions = (module: string, perms: Permission[]) => {
    const moduleCodes = perms.map(p => p.code);
    const allSelected = moduleCodes.every(c => selectedPermissions.includes(c));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !moduleCodes.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...moduleCodes])]);
    }
  };

  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.dni.includes(searchTerm)
  );

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p className="text-gray-400">Solo los administradores pueden gestionar usuarios.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-400 mt-4">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-brand-gold" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Administra los usuarios del sistema (administradores y profesores)
          </p>
        </div>
        
        <button
          onClick={handleCreateUser}
          className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black rounded-lg hover:bg-yellow-400 transition font-medium"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre, email o DNI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
        />
      </div>

      {/* Users Table */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#111]">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">DNI</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Rol</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Último Acceso</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-[#222] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                        {user.phone && <p className="text-gray-500 text-sm">{user.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{user.email}</td>
                  <td className="px-4 py-3 text-gray-300">{user.dni}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${ROLE_LABELS[user.role].color}`}>
                      {ROLE_LABELS[user.role].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {user.lastLoginAt 
                      ? new Date(user.lastLoginAt).toLocaleDateString('es-AR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Nunca'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleManagePermissions(user)}
                        className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition"
                        title="Gestionar Permisos"
                      >
                        <Shield size={18} />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            {searchTerm ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios registrados'}
          </div>
        )}
      </div>

      {/* Modal: Crear/Editar Usuario */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] max-w-lg w-full rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-brand-gold to-yellow-500 p-4">
              <h2 className="text-xl font-bold text-black">
                {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Email */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editingUser.firstName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Apellido *</label>
                  <input
                    type="text"
                    value={editingUser.lastName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                    placeholder="Apellido"
                  />
                </div>
              </div>

              {/* DNI y Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">DNI *</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      value={editingUser.dni || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, dni: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                      placeholder="12345678"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                      placeholder="11 1234 5678"
                    />
                  </div>
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Contraseña {!selectedUser && '*'}
                  {selectedUser && <span className="text-gray-500">(dejar vacío para no cambiar)</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Rol *</label>
                <select
                  value={editingUser.role || 'TRAINER'}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'ADMIN' | 'TRAINER' })}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                >
                  <option value="TRAINER">Profesor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingUser.isActive ?? true}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-700 bg-[#111] text-brand-gold focus:ring-brand-gold"
                />
                <label htmlFor="isActive" className="text-gray-300">Usuario activo</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                  setEditingUser({});
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black rounded-lg hover:bg-yellow-400 transition font-medium disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gestionar Permisos */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] max-w-2xl w-full rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-4">
              <h2 className="text-xl font-bold text-white">Permisos de {selectedUser.firstName}</h2>
              <p className="text-purple-200 text-sm">Selecciona los permisos que tendrá este usuario</p>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {selectedUser.role === 'ADMIN' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
                  <p className="text-purple-300 text-sm">
                    <Shield className="inline mr-2" size={16} />
                    Los administradores tienen acceso completo a todas las funciones del sistema.
                  </p>
                </div>
              )}

              {Object.entries(allPermissions.grouped).map(([module, perms]) => {
                const permsList = perms as Permission[];
                const isExpanded = expandedModules.includes(module);
                const selectedCount = permsList.filter(p => selectedPermissions.includes(p.code)).length;
                const allSelected = selectedCount === permsList.length;
                
                return (
                  <div key={module} className="border border-gray-700 rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 bg-[#111] cursor-pointer hover:bg-[#1a1a1a]"
                      onClick={() => toggleModule(module)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                        <span className="text-white font-medium">{MODULE_NAMES[module] || module}</span>
                        <span className="text-gray-500 text-sm">({selectedCount}/{permsList.length})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllModulePermissions(module, permsList);
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition ${
                          allSelected 
                            ? 'bg-brand-gold/20 text-brand-gold' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        disabled={selectedUser.role === 'ADMIN'}
                      >
                        {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
                      </button>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-3 space-y-2 bg-[#0a0a0a]">
                        {permsList.map(perm => (
                          <label 
                            key={perm.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                              selectedPermissions.includes(perm.code) 
                                ? 'bg-brand-gold/10' 
                                : 'hover:bg-gray-800'
                            } ${selectedUser.role === 'ADMIN' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUser.role === 'ADMIN' || selectedPermissions.includes(perm.code)}
                              onChange={() => togglePermission(perm.code)}
                              disabled={selectedUser.role === 'ADMIN'}
                              className="w-4 h-4 rounded border-gray-600 bg-[#111] text-brand-gold focus:ring-brand-gold"
                            />
                            <div className="flex-1">
                              <p className="text-white text-sm">{perm.name}</p>
                              {perm.description && (
                                <p className="text-gray-500 text-xs">{perm.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving || selectedUser.role === 'ADMIN'}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition font-medium disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                Guardar Permisos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] max-w-md w-full rounded-xl border border-gray-700 p-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Eliminar Usuario</h3>
              <p className="text-gray-400 mb-6">
                ¿Estás seguro de eliminar a <strong className="text-white">{selectedUser.firstName} {selectedUser.lastName}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
