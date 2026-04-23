import { UserWithInvitations, InvitationFile, SaveInvitationResponse, UserPlan } from '../types';

const getApiBase = () => {
  return window.location.origin;
};

const API_BASE = `${getApiBase()}/api`;
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const getUser = async (userId: string, token: string): Promise<UserWithInvitations> => {
  const response = await fetch(`${API_BASE}/get-user/${userId}`, {
    credentials: 'include',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const consumeCredit = async (userId: string, token: string, purchaseId: string): Promise<{ success: boolean; iteration_credits: number; purchase_id: string }> => {
  const response = await fetch(`${API_BASE}/user/${userId}/consume-credit`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token)
    },
    body: JSON.stringify({ purchaseId })
  });
  return handleResponse(response);
};

export const consumeGenerationCredit = async (userId: string, token: string, purchaseId: string): Promise<{ success: boolean; generation_credits: number; purchase_id: string }> => {
  const response = await fetch(`${API_BASE}/user/${userId}/consume-generation-credit`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token)
    },
    body: JSON.stringify({ purchaseId })
  });
  return handleResponse(response);
};

export const saveInvitation = async (
  htmlContent: string,
  eventType: string | undefined,
  purchaseId: string,
  replaceFilename?: string,
  token?: string
): Promise<SaveInvitationResponse> => {
  const body: Record<string, unknown> = { htmlContent, eventType, purchaseId };
  if (replaceFilename) body.replaceFilename = replaceFilename;

  const response = await fetch(`${API_BASE}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token)
    },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  
  if (response.status === 409) {
    const data = await response.json();
    const error: any = new Error(data.error);
    error.code = data.code;
    error.existing_filename = data.existing_filename;
    error.isPlanHasInvitation = true;
    throw error;
  }
  
  return handleResponse(response);
};

export const replaceInvitation = async (
  userId: string,
  filename: string,
  htmlContent: string,
  eventType: string | undefined,
  purchaseId: string,
  token?: string
): Promise<SaveInvitationResponse> => {
  const response = await fetch(`${API_BASE}/invitations/replace/${userId}/${filename}`, {
    method: 'PUT',
    headers: {
      'Content-Type':  'application/json',
      ...getAuthHeaders(token)
    },
    credentials: 'include',
    body: JSON.stringify({ htmlContent, eventType, purchaseId })
  });
  
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
    redirectToLogin();
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

const redirectToLogin = async () => {
  try {
    const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
    const res = await fetch(`${baseUrl}/api/config/public`);
    const config = await res.json();
    window.location.href = config.login_page_url || '/admin-login';
  } catch {
    window.location.href = '/admin-login';
  }
};

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    const error = await response.json();
    if (error.code === 'NO_TOKEN' || error.code === 'INVALID_TOKEN') {
      await redirectToLogin();
    }
    throw new Error('No autenticado');
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la solicitud');
  }
  
  return response.json();
};