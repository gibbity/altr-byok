
export type ProjectType = 'component' | 'ui' | 'website';
export type Platform = 'mobile' | 'desktop';

export interface GeneratedInteraction {
  id: string;
  name: string;
  prompt: string;
  html: string;
  css: string;
  js: string;
  timestamp: number;
  variationOf?: string;
  hasImage?: boolean;
  projectType: ProjectType;
  platform?: Platform;
}

export interface GenerationResponse {
  name: string;
  html: string;
  css: string;
  js: string;
}

export interface ImageAttachment {
  data: string; // base64
  mimeType: string;
}
