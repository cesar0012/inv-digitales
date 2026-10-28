
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
  type: 'ai' | 'stock' | 'wireframe';
  description: string;
  warning?: string; // For hover warnings like latency
  promptInstruction: string; // Instructions for Gemini on how to construct the URL
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
