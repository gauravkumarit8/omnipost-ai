export type Tone = 'professional' | 'witty' | 'empathetic';
export type Platform = 'twitter' | 'linkedin' | 'instagram' | 'newsletter' | 'medium';

export interface RepurposeRequest {
  content: string;
  platform: Platform;
  tone: Tone;
}

export interface RepurposeResponse {
  result: string;
}