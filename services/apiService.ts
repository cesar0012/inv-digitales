import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:3001/api';
const PUBLIC_BASE = 'http://localhost:3001';

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

export const getUser = async (userId: string): Promise<UserWithInvitations> => {
  const response = await fetch(`${API_BASE}/user/${userId}`, {
    credentials: 'include'
  });
  return handleResponse(response);
};

export const getAllUsers = async (): Promise<AllUsersResponse> => {
  const response = await fetch(`${API_BASE}/users`, {
    credentials: 'include'
  });
  return handleResponse(response);
};

export const consumeCredit = async (userId: string): Promise<{ success: boolean; iteration_credits: number }> => {
  const response = await fetch(`${API_BASE}/user/${userId}/consume-credit`, {
    method: 'POST',
    credentials: 'include'
  });
  return handleResponse(response);
};

export const consumeGenerationCredit = async (userId: string): Promise<{ success: boolean; generation_credits: number }> => {
  const response = await fetch(`${API_BASE}/user/${userId}/consume-generation-credit`, {
    method: 'POST',
    credentials: 'include'
  });
  return handleResponse(response);
};

export const saveInvitation = async (
  htmlContent: string, 
  eventType?: string,
  replaceFilename?: string
): Promise<SaveInvitationResponse> => {
  const response = await fetch(`${API_BASE}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export const getInvitations = async (userId: string): Promise<{ invitations: InvitationFile[] }> => {
  const response = await fetch(`${API_BASE}/invitations/${userId}`, {
    credentials: 'include'
  });
  return handleResponse(response);
};

export const getInvitationContent = async (filename: string, userId: string): Promise<string> => {
  const response = await fetch(`${API_BASE}/invitations/${userId}/${filename}`, {
    credentials: 'include'
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

export const getPublicUrl = (slug: string): string => {
  return `${PUBLIC_BASE}/i/${slug}`;
};
