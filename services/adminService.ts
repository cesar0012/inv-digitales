const API_BASE = 'http://localhost:3001/api';

const getAdminHeaders = () => {
  const token = localStorage.getItem('admin_token');
  console.log('Admin token exists:', !!token);
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export interface AdminConfig {
  html_provider: string;
  html_base_url: string;
  html_api_key: string;
  html_model: string;
  html_google_api_key: string;
  html_google_model: string;
  image_provider: string;
  image_model: string;
  image_api_key: string;
  login_page_url: string;
  updated_at: string | null;
}

export interface AdminUser {
  user_id: string;
  invitations_count: number;
  iteration_credits: number;
  invitations_remaining: number;
  max_invitations: number;
  max_iteration_credits: number;
  generation_credits: number;
  max_generation_credits: number;
  created_at: string;
}

export interface AdminInvitation {
  id: string;
  user_id: string;
  filename: string;
  slug: string;
  publicUrl: string;
  event_type: string;
  starred: boolean;
  created_at: string;
  size: number;
}

export const getAdminConfig = async (): Promise<AdminConfig> => {
  const response = await fetch(`${API_BASE}/admin/config`, {
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener configuración');
  }
  
  return response.json();
};

export const saveAdminConfig = async (config: Partial<AdminConfig>): Promise<void> => {
  const response = await fetch(`${API_BASE}/admin/config`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(config)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al guardar configuración');
  }
};

export const getAdminUsers = async (): Promise<{ users: AdminUser[]; total: number }> => {
  const response = await fetch(`${API_BASE}/admin/users`, {
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener usuarios');
  }
  
  return response.json();
};

export const updateAdminUser = async (userId: string, data: Partial<AdminUser>): Promise<AdminUser> => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar usuario');
  }
  
  const result = await response.json();
  return result.user;
};

export const getAdminInvitations = async (starred?: boolean): Promise<{ invitations: AdminInvitation[]; total: number }> => {
  let url = `${API_BASE}/admin/invitations`;
  if (starred !== undefined) {
    url += `?starred=${starred}`;
  }
  
  const response = await fetch(url, {
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener invitaciones');
  }
  
  return response.json();
};

export const starInvitation = async (userId: string, filename: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/admin/invitations/${userId}/${filename}/star`, {
    method: 'POST',
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al marcar invitación');
  }
};

export const unstarInvitation = async (userId: string, filename: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/admin/invitations/${userId}/${filename}/star`, {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al desmarcar invitación');
  }
};

export const deleteInvitation = async (userId: string, filename: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/admin/invitations/${userId}/${filename}`, {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar invitación');
  }
};

export const starCatalogo = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/catalogo/${id}/star`, {
    method: 'POST',
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al marcar invitación del catálogo');
  }
};

export const unstarCatalogo = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/catalogo/${id}/star`, {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al desmarcar invitación del catálogo');
  }
};



export const getCatalogo = async (starred?: boolean): Promise<{ invitaciones: any[] }> => {
  let url = `${API_BASE}/catalogo`;
  if (starred !== undefined) {
    url += `?starred=${starred}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener catálogo');
  }
  return response.json();
};

export const deleteCatalogoItem = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/admin/catalogo/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar invitación del catálogo');
  }
};

export const syncUsers = async (): Promise<{ success: boolean; message: string; total: number }> => {
  const response = await fetch(`${API_BASE}/admin/sync-users`, {
    method: 'POST',
    headers: getAdminHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al sincronizar usuarios');
  }
  
  return response.json();
};