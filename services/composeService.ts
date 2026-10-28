// Client for the event-first creation flow (server/composeRoutes.js).

export type FieldType = 'text' | 'textarea' | 'date' | 'time' | 'select' | 'checkbox' | 'url' | 'repeat';

export interface OptionFrom {
  value: string;
  labelFrom?: string;
  fallback?: string;
}

export interface FieldDef {
  key: string;
  label?: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  optionsFrom?: OptionFrom[];
  allowCustom?: boolean;
  // repeat
  title?: string;
  itemLabel?: string;
  addLabel?: string;
  suggested?: number;
  min?: number;
  max?: number;
  maxNotice?: string;
  itemFields?: FieldDef[];
  notice?: string;
}

export interface SectionDef {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
}

export interface EventPack {
  id: string;
  label: string;
  description: string;
  honorees: number;
  sections: SectionDef[];
  modules: { type: string; when: string }[];
}

export interface EventTypeSummary {
  id: string;
  label: string;
  description: string;
  honorees: number;
}

export interface DesignSummary {
  id: string;
  label: string;
  madeFor: boolean;
  eventTypes: string[];
  modules: string[];
  swatch: string[];
  screenshot: string | null;
}

export type RepeatItem = Record<string, string | boolean>;
export type EventFormData = Record<string, string | boolean | RepeatItem[]>;

export interface ComposeReport {
  modules: { type: string; id: string; borrowedFrom: string | null; instance: number }[];
  skipped: { type: string; reason: string }[];
  warnings: { type: string; kind: string; sample: string }[];
  placeholderImages: number;
}

export interface ComposePayload {
  eventType: string;
  designId: string;
  data: EventFormData;
  preferences?: { primaryColor?: string; secondaryColor?: string };
  purchaseId?: string;
}

const API = `${window.location.origin}/api`;

const headers = (token?: string, json = false): Record<string, string> => {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (json) h['Content-Type'] = 'application/json';
  if (token && token !== 'null' && token !== 'undefined') h.Authorization = `Bearer ${token}`;
  return h;
};

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error || `Error ${res.status}`) as Error & { status?: number; missing?: { key: string; label: string }[] };
    err.status = res.status;
    err.missing = body?.missing;
    throw err;
  }
  return body as T;
}

export const getEventTypes = async (token: string) =>
  (await handle<{ eventTypes: EventTypeSummary[] }>(await fetch(`${API}/event-types`, { credentials: 'include', headers: headers(token) }))).eventTypes;

export const getEventPack = async (id: string, token: string) =>
  (await handle<{ pack: EventPack }>(await fetch(`${API}/event-types/${encodeURIComponent(id)}`, { credentials: 'include', headers: headers(token) }))).pack;

export const getDesigns = async (eventType: string, token: string) =>
  (await handle<{ designs: DesignSummary[] }>(await fetch(`${API}/designs?eventType=${encodeURIComponent(eventType)}`, { credentials: 'include', headers: headers(token) }))).designs;

export const getDesignSample = async (designId: string, eventType: string, token: string): Promise<string> => {
  const res = await fetch(`${API}/designs/${encodeURIComponent(designId)}/sample?eventType=${encodeURIComponent(eventType)}`, { credentials: 'include', headers: headers(token) });
  if (!res.ok) throw new Error('No se pudo cargar el ejemplo');
  return res.text();
};

export const getDesignScreenshot = async (path: string, token: string): Promise<string | null> => {
  const res = await fetch(`${window.location.origin}${path}`, { credentials: 'include', headers: headers(token) });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
};

export const previewInvitation = async (payload: ComposePayload, token: string, signal?: AbortSignal) =>
  handle<{ html: string; missing: { key: string; label: string }[]; report: ComposeReport; design: string; eventType: string }>(
    await fetch(`${API}/compose/preview`, { method: 'POST', credentials: 'include', headers: headers(token, true), body: JSON.stringify(payload), signal })
  );

export const createInvitation = async (payload: ComposePayload, token: string) =>
  handle<{ html: string; report: ComposeReport; design: string; eventType: string; eventLabel: string }>(
    await fetch(`${API}/compose/create`, { method: 'POST', credentials: 'include', headers: headers(token, true), body: JSON.stringify(payload) })
  );
