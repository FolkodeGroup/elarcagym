// Servicio centralizado para consumir la API REST del backend
// Se implementarán funciones para cada entidad (members, products, sales, etc.)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// Ejemplo de uso para members
export const MembersAPI = {
  list: () => apiFetch('/members'),
  get: (id: string) => apiFetch(`/members/${id}`),
  create: (data: any) => apiFetch('/members', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/members/${id}`, { method: 'DELETE' }),
};

// Se pueden agregar APIs similares para products, sales, etc.
