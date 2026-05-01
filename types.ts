
export type ModelProvider = 'gemini' | 'chutes';

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  associatedCode?: string; // Snapshot of the code at this point
}

export interface Attachment {
  type: 'image' | 'url';
  content: string; // Base64 for image, string for URL
  mimeType?: string;
}

export interface GeneratedCode {
  html: string;
  css?: string;
  js?: string;
  framework?: 'react' | 'vue' | 'html' | 'wordpress';
}

export interface ImageSource {
  id: string;
  name: string;
  type: 'ai' | 'stock' | 'wireframe' | 'local';
  description: string;
  warning?: string;
  promptInstruction: string;
}

export interface LocalImageFile {
  filename: string;
  section: string;
}

export interface SelectedElement {
  tagName: string;
  id?: string;
  geminiId?: string;
  content: string;
  fullHtml: string;
  src?: string;
  href?: string;
}

export interface ProjectPage {
  id: string;
  name: string; // e.g., "Home", "About Us"
  path: string; // e.g., "index.html", "about.html"
  code: string;
  isCreated: boolean;
}

export interface LinkDefinition {
  text: string;
  href: string;
  context: string; // The surrounding HTML or parent tag
}

export enum AppMode {
  INITIAL = 'INITIAL',
  ITERATING = 'ITERATING',
}

export interface InvitationMetadata {
  version: number;
  createdAt: string;
  modifiedAt: string;
  eventType: string;
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  hiddenModules: string[];
  elementStyles: Record<string, {
    styles: Record<string, string>;
    animationClass: string;
  }>;
}

export interface EditorConfig {
  eventType: string;
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  eventDetails: string;
  visualStyle?: string;
  mood?: string;
}

export interface InvitationFile {
  filename: string;
  slug: string;
  publicUrl: string;
  event_type: string;
  created_at: string;
  size: number;
  purchase_id?: string;
  plan_slug?: string;
}

export interface PlanInvitation {
  filename: string;
  slug: string;
  event_type: string;
  event_domain?: string | null;
  event_date?: string | null;
  event_time?: string | null;
}

export interface UserPlan {
  id: number;
  purchase_id: string;
  plan_slug: string;
  plan_name: string;
  invites_included: number;
  invites_used: number;
  generation_credits: number;
  generation_used: number;
  iteration_credits: number;
  iteration_used: number;
  generation_available: number;
  iteration_available: number;
  invites_available: number;
  has_invitation: boolean;
  invitation: PlanInvitation | null;
}

export interface SaveInvitationResponse {
  success: boolean;
  filename: string;
  slug: string;
  publicUrl: string;
  purchase_id: string;
  plan_slug: string;
  generation_available: number;
  invites_available: number;
}

export interface UserWithInvitations {
  user_id: string;
  name: string;
  created_at: string;
  plans: UserPlan[];
  invitations: InvitationFile[];
}

export interface AllUsersResponse {
  users: UserWithInvitations[];
  total: number;
}

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
  updated_at: string | null;
}

export interface AdminUser {
  user_id: string;
  name: string | null;
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
  created_at: string;
  size: number;
  starred: boolean;
  title?: string;
  theme?: string;
  purchase_id?: string;
  plan_slug?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}
