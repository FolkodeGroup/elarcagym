// ==================== RUTINA SELF-SERVICE (TOKEN) ====================
export const RoutineAccessAPI = {
  validateRoutineAccess: async (token: string, dni: string) => {
    const res = await fetch(`${API_URL}/routine-access/validate-routine-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, dni })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `API error: ${res.status}`);
    }
    return res.json();
  },
  validateRoutineAccessByDni: async (dni: string) => {
    const res = await fetch(`${API_URL}/routine-access/selfservice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `API error: ${res.status}`);
    }
    return res.json();
  }
};
// Servicio centralizado para consumir la API REST del backend
// Implementa funciones para cada entidad (members, products, sales, etc.)

import { Member, Product, Sale, Reminder, Slot, Reservation, ExerciseMaster, Routine, BiometricLog, PaymentLog, Diet } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Obtener token del localStorage
function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Guardar token en localStorage
export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

// Eliminar token del localStorage
export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

// Función base para todas las llamadas a la API
export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  // Agregar token de autorización si existe
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  // Para respuestas 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
    if (errorData.error && errorData.error.toLowerCase().includes('token')) {
      clearToken();
      // Forzar logout automático y recargar la app
      window.location.href = '/';
    }
    throw new Error(errorData.error || `API error: ${res.status}`);
  }
  
  return res.json();
}

// ==================== AUTH API ====================
export const AuthAPI = {
  login: async (email: string, password: string): Promise<{ token: string }> => {
    const result = await apiFetch<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.token) {
      setToken(result.token);
    }
    return result;
  },
  
  register: (data: { email: string; password: string; firstName: string; lastName: string; dni: string; phone: string; status: string; phase: string }) => 
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  
  logout: () => {
    clearToken();
  },
  
  isAuthenticated: () => !!getToken(),
};

// ==================== PUBLIC API (sin autenticación) ====================
export const PublicAPI = {
  // Obtener rutinas de un socio por DNI (para portal self-service)
  getMemberRoutine: async (dni: string): Promise<Member> => {
    const res = await fetch(`${API_URL}/public/member-routine/${dni}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `API error: ${res.status}`);
    }
    return res.json();
  },
};

// ==================== MEMBERS API ====================
export const MembersAPI = {
  list: (): Promise<Member[]> => apiFetch('/members'),
  
  get: (id: string): Promise<Member> => apiFetch(`/members/${id}`),
  
  getByDNI: (dni: string): Promise<Member> => apiFetch(`/members/dni/${dni}`),
  
  create: (data: Partial<Member>): Promise<Member> => 
    apiFetch('/members', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<Member>): Promise<Member> => 
    apiFetch(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/members/${id}`, { method: 'DELETE' }),
  
  // Biometrics para un miembro específico
  getBiometrics: (memberId: string): Promise<BiometricLog[]> => 
    apiFetch(`/members/${memberId}/biometrics`),
  
  addBiometric: (memberId: string, data: Omit<BiometricLog, 'id'>): Promise<BiometricLog> => 
    apiFetch(`/members/${memberId}/biometrics`, { method: 'POST', body: JSON.stringify(data) }),
  
  updateBiometric: (memberId: string, biometricId: string, data: Partial<BiometricLog>): Promise<BiometricLog> => 
    apiFetch(`/members/${memberId}/biometrics/${biometricId}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteBiometric: (memberId: string, biometricId: string): Promise<void> => 
    apiFetch(`/members/${memberId}/biometrics/${biometricId}`, { method: 'DELETE' }),
  
  // Routines para un miembro específico
  getRoutines: (memberId: string): Promise<Routine[]> => 
    apiFetch(`/members/${memberId}/routines`),
  
  addRoutine: (memberId: string, data: Omit<Routine, 'id' | 'createdAt'>): Promise<Routine> => 
    apiFetch(`/members/${memberId}/routines`, { method: 'POST', body: JSON.stringify(data) }),
  
  updateRoutine: (memberId: string, routineId: string, data: Partial<Routine>): Promise<Routine> => 
    apiFetch(`/members/${memberId}/routines/${routineId}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteRoutine: (memberId: string, routineId: string): Promise<void> => 
    apiFetch(`/members/${memberId}/routines/${routineId}`, { method: 'DELETE' }),
  
  // Payments para un miembro específico
  getPayments: (memberId: string): Promise<PaymentLog[]> => 
    apiFetch(`/members/${memberId}/payments`),
  
  addPayment: (memberId: string, data: Omit<PaymentLog, 'id'>): Promise<PaymentLog> => 
    apiFetch(`/members/${memberId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  
  // Nutrition plan
  updateNutritionPlan: (memberId: string, nutritionPlan: any): Promise<Member> => 
    apiFetch(`/members/${memberId}/nutrition`, { method: 'PUT', body: JSON.stringify(nutritionPlan) }),
};

// ==================== PRODUCTS API ====================
export const ProductsAPI = {
  list: (): Promise<Product[]> => apiFetch('/products'),
  
  get: (id: string): Promise<Product> => apiFetch(`/products/${id}`),
  
  create: (data: Omit<Product, 'id'>): Promise<Product> => 
    apiFetch('/products', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<Product>): Promise<Product> => 
    apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/products/${id}`, { method: 'DELETE' }),
};

// ==================== SALES API ====================
export const SalesAPI = {
  list: (): Promise<Sale[]> => apiFetch('/sales'),
  
  get: (id: string): Promise<Sale> => apiFetch(`/sales/${id}`),
  
  create: (data: { items: { productId: string; quantity: number }[]; memberId?: string; total?: number }): Promise<Sale> => 
    apiFetch('/sales', { method: 'POST', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/sales/${id}`, { method: 'DELETE' }),
};

// ==================== REMINDERS API ====================
export const RemindersAPI = {
  list: (): Promise<Reminder[]> => apiFetch('/reminders'),
  
  get: (id: string): Promise<Reminder> => apiFetch(`/reminders/${id}`),
  
  create: (data: Omit<Reminder, 'id'>): Promise<Reminder> => 
    apiFetch('/reminders', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<Reminder>): Promise<Reminder> => 
    apiFetch(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/reminders/${id}`, { method: 'DELETE' }),
};

// ==================== SLOTS API ====================
export const SlotsAPI = {
  list: (): Promise<Slot[]> => apiFetch('/slots'),
  
  get: (id: string): Promise<Slot> => apiFetch(`/slots/${id}`),
  
  create: (data: Omit<Slot, 'id'>): Promise<Slot> => 
    apiFetch('/slots', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<Slot>): Promise<Slot> => 
    apiFetch(`/slots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/slots/${id}`, { method: 'DELETE' }),
};

// ==================== RESERVATIONS API ====================
export const ReservationsAPI = {
  list: (): Promise<Reservation[]> => apiFetch('/reservations'),
  
  get: (id: string): Promise<Reservation> => apiFetch(`/reservations/${id}`),
  
  create: (data: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation> => 
    apiFetch('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<Reservation>): Promise<Reservation> => 
    apiFetch(`/reservations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/reservations/${id}`, { method: 'DELETE' }),
};

// ==================== EXERCISES API ====================
export const ExercisesAPI = {
  list: (): Promise<ExerciseMaster[]> => apiFetch('/exercises'),
  
  get: (id: string): Promise<ExerciseMaster> => apiFetch(`/exercises/${id}`),
  
  create: (data: Omit<ExerciseMaster, 'id'>): Promise<ExerciseMaster> => 
    apiFetch('/exercises', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<ExerciseMaster>): Promise<ExerciseMaster> => 
    apiFetch(`/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/exercises/${id}`, { method: 'DELETE' }),
};

// ==================== DIETS API ====================
export const DietsAPI = {
  list: (): Promise<Diet[]> => apiFetch('/diets'),
  
  get: (id: string): Promise<Diet> => apiFetch(`/diets/${id}`),
  
  create: (data: Omit<Diet, 'id' | 'generatedAt'>): Promise<Diet> => 
    apiFetch('/diets', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<Diet>): Promise<Diet> => 
    apiFetch(`/diets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/diets/${id}`, { method: 'DELETE' }),
};

// ==================== PAYMENT LOGS API ====================
export const PaymentLogsAPI = {
  list: (): Promise<PaymentLog[]> => apiFetch('/payment-logs'),
  
  get: (id: string): Promise<PaymentLog> => apiFetch(`/payment-logs/${id}`),
  
  create: (data: Omit<PaymentLog, 'id'>): Promise<PaymentLog> => 
    apiFetch('/payment-logs', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<PaymentLog>): Promise<PaymentLog> => 
    apiFetch(`/payment-logs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string): Promise<void> => 
    apiFetch(`/payment-logs/${id}`, { method: 'DELETE' }),
};
