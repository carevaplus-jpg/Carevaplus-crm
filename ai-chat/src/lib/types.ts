export type Mode = 'auto' | 'single' | 'council';
export type StyleKey = 'normal' | 'concise' | 'explanatory' | 'formal' | 'friendly';
export type Theme = 'system' | 'light' | 'dark';
export type VoiceEngine = 'auto' | 'browser' | 'ai';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  vision: boolean;
  audio: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
  created: number;
  score: number;
}

export interface FileAttachment { name: string; text: string }

export interface Draft {
  model: string;
  content: string;
  status: 'pending' | 'done' | 'error';
  error?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  // user
  images?: string[];
  files?: FileAttachment[];
  // assistant
  model?: string;
  reasoning?: string;
  thinkStart?: number;
  thinkEnd?: number;
  status?: 'streaming' | 'done';
  phase?: 'council' | 'synth';
  drafts?: Draft[];
  notes?: string[];
  error?: string;
  stopped?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
  messages: Message[];
}

export interface Settings {
  apiKey: string;
  mode: Mode;
  model: string;
  councilSize: number;
  temperature: number;
  instructions: string;
  userName: string;
  theme: Theme;
  showThinking: boolean;
  style: StyleKey;
  thinking: boolean;
  voiceLang: string;
  voiceEngine: VoiceEngine;
  voiceAutoSend: boolean;
  rail: boolean;
}

export type Attachment =
  | { kind: 'image'; name: string; url: string }
  | { kind: 'file'; name: string; text: string };
