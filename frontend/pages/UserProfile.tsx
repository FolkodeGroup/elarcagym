import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Camera, 
  Lock,
  Save,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UsersAPI, SystemUser } from '../services/api';

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  ADMIN: { 
    label: 'Administrador', 
    color: 'bg-purple-500', 
    description: 'Acceso completo a todas las funciones del sistema' 
  },
  TRAINER: { 
    label: 'Profesor', 
    color: 'bg-blue-500', 
    description: 'Acceso a gestión de rutinas, socios y seguimiento' 
  },
};

const UserProfile: React.FC = () => {
  const { user: authUser, isAdmin } = useAuth();
  const [profile, setProfile] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await UsersAPI.getMyProfile();
      setProfile(data);
      setEditData({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      await UsersAPI.update(profile.id, editData);
      setProfile({ ...profile, ...editData });
      setIsEditing(false);
      setSuccess('Perfil actualizado correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setError('Completa todos los campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await UsersAPI.changePassword(currentPassword, newPassword);
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Contraseña actualizada correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">No se pudo cargar el perfil</p>
      </div>
    );
  }

  const roleInfo = ROLE_LABELS[profile.role];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={18} /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#252525] border border-gray-800 rounded-xl overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-gold/20 to-transparent"></div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-xl bg-gray-700 border-4 border-[#1a1a1a] flex items-center justify-center overflow-hidden">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-brand-gold rounded-lg flex items-center justify-center text-black hover:bg-yellow-400 transition">
                <Camera size={16} />
              </button>
            </div>

            {/* Name and Role */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {profile.firstName} {profile.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
                <span className="text-gray-400 text-sm">{roleInfo.description}</span>
              </div>
            </div>

            {/* Edit Button */}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Editar Perfil
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <User size={20} className="text-brand-gold" />
            Información Personal
          </h2>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Nombre</label>
                <input
                  type="text"
                  value={editData.firstName}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Apellido</label>
                <input
                  type="text"
                  value={editData.lastName}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Teléfono</label>
                <input
                  type="text"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      firstName: profile.firstName,
                      lastName: profile.lastName,
                      phone: profile.phone || '',
                    });
                  }}
                  className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-gold text-black rounded-lg hover:bg-yellow-400 transition font-medium disabled:opacity-50"
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
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail size={18} className="text-gray-500" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Phone size={18} className="text-gray-500" />
                <span>{profile.phone || 'No especificado'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Shield size={18} className="text-gray-500" />
                <span>DNI: {profile.dni}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Calendar size={18} className="text-gray-500" />
                <span>
                  Miembro desde: {new Date(profile.createdAt).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              {profile.lastLoginAt && (
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <CheckCircle size={18} className="text-green-500" />
                  <span>
                    Último acceso: {new Date(profile.lastLoginAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lock size={20} className="text-brand-gold" />
            Seguridad
          </h2>

          {showPasswordChange ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Contraseña Actual</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-gold text-black rounded-lg hover:bg-yellow-400 transition font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lock size={18} />
                  )}
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-sm mb-4">
                Mantén tu cuenta segura actualizando tu contraseña regularmente.
              </p>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center justify-center gap-2"
              >
                <Lock size={18} />
                Cambiar Contraseña
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Permissions (only for trainers) */}
      {profile.role === 'TRAINER' && profile.permissions && profile.permissions.length > 0 && (
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Shield size={20} className="text-brand-gold" />
            Mis Permisos
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.permissions.map(perm => (
              <span 
                key={perm}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-purple-400" />
            <div>
              <h3 className="text-white font-medium">Cuenta de Administrador</h3>
              <p className="text-purple-300 text-sm">
                Tienes acceso completo a todas las funciones del sistema, incluyendo la gestión de usuarios y permisos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
