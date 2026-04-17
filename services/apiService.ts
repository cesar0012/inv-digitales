import { useAuth } from '../contexts/AuthContext';

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return base.replace(/\/api\/?$/, '');
};

const API_BASE = `${getApiBase()}/api`;
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

// Helper para obtener headers de autenticación
// Recibe token opcional desde componentes React
const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export interface UserData {
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

export interface InvitationFile {
  filename: string;
  slug: string;
  publicUrl: string;
  event_type: string;
  created_at: string;
  size: number;
}

export interface SaveInvitationResponse {
  success: boolean;
  filename: string;
  slug: string;
  publicUrl: string;
  invitations_count: number;
  invitations_remaining: number;
}

export interface LimitReachedError {
  error: string;
  code: 'LIMIT_REACHED';
  max_invitations: number;
  invitations: InvitationFile[];
}

export interface UserWithInvitations extends UserData {
  invitations: InvitationFile[];
}

export interface AllUsersResponse {
  users: UserWithInvitations[];
  total: number;
}

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    const error = await response.json();
    if (error.code === 'NO_TOKEN' || error.code === 'INVALID_TOKEN') {
      window.location.href = '/test';
    }
    throw new Error('No autenticado');
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la solicitud');
  }
  
  return response.json();
};

export const getUser = async (userId: string, token: string): Promise<UserWithInvitations> => {
  const response = await fetch(`${API_BASE}/get-user/${userId}`, {
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const getAllUsers = async (token: string): Promise<AllUsersResponse> => {
  const response = await fetch(`${API_BASE}/users`, {
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const consumeCredit = async (userId: string, token: string): Promise<{ success: boolean; iteration_credits: number }> => {
  const response = await fetch(`${API_BASE}/user/${userId}/consume-credit`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const consumeGenerationCredit = async (userId: string, token: string): Promise<{ success: boolean; generation_credits: number }> => {
  const response = await fetch(`${API_BASE}/user/${userId}/consume-generation-credit`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const saveInvitation = async (
  htmlContent: string, 
  eventType?: string,
  replaceFilename?: string,
  token: string
): Promise<SaveInvitationResponse> => {
  const response = await fetch(`${API_BASE}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token)
    },
    credentials: 'include',
    body: JSON.stringify({ htmlContent, eventType, replaceFilename })
  });
  
  if (response.status === 409) {
    const data: LimitReachedError = await response.json();
    const error: any = new Error(data.error);
    error.code = data.code;
    error.max_invitations = data.max_invitations;
    error.invitations = data.invitations;
    error.isLimitReached = true;
    throw error;
  }
  
  return handleResponse(response);
};

export const getInvitations = async (userId: string, token: string): Promise<{ invitations: InvitationFile[] }> => {
  const response = await fetch(`${API_BASE}/invitations/${userId}`, {
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const getInvitationContent = async (filename: string, userId: string, token: string): Promise<string> => {
  const response = await fetch(`${API_BASE}/invitations/${userId}/${filename}`, {
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  
  if (response.status === 401) {
    window.location.href = '/test';
    throw new Error('No autenticado');
  }
  
  if (!response.ok) {
    throw new Error('Error al obtener contenido de invitación');
  }
  
  return response.text();
};

export const getAllUsers = async (token: string): Promise<AllUsersResponse> => {
  const response = await fetch(`${API_BASE}/users`, {
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const consumeCredit = async (userId: string, token: string): Promise<{ success: boolean; iteration_credits: number }> => {
  const response = await fetch(`${API_BASE}/user/${userId}/consume-credit`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const consumeGenerationCredit = async (userId: string, token: string): Promise<{ success: boolean; generation_credits: number }> => {
  const response = await fetch(`${API_BASE}/user/${userId}/consume-generation-credit`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const getPublicUrl = (slug: string): string => {
  return `${PUBLIC_BASE}/i/${slug}`;
};
