
export type ProjectType = 'component' | 'ui' | 'website' | 'graphics';
export type Platform = 'mobile' | 'desktop';

export interface TweakDefinition {
  id: string;
  label: string;
  type: 'slider' | 'color';
  min?: number;
  max?: number;
  step?: number;
  value: string | number;
  property: string; // The CSS variable name
}

export interface SelectedElement {
  selector: string;
  tagName: string;
  styles: Record<string, string>;
  rect: DOMRect;
}

export interface GeneratedInteraction {
  id: string;
  name: string;
  prompt: string;
  html: string;
  css: string;
  js: string;
  tweaks?: TweakDefinition[];
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
  tweaks?: TweakDefinition[];
}

export interface ImageAttachment {
  data: string; // base64
  mimeType: string;
}
