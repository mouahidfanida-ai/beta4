
export interface ClassGroup {
  id: string;
  name: string;
  description: string;
}

export interface Session {
  id: string;
  classId: string;
  title: string;
  description: string;
  videoUrl: string; // Legacy/Primary video
  videoUrls?: string[]; // All videos (primary + extras)
  pdfUrl?: string; // Optional PDF link
  date: string;
  aiNotes?: string; // AI generated exam notes
  isHighlight?: boolean; // Feature on landing page
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  note1: number;
  note2: number;
  note3: number;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  description: string;
  imageUrl?: string;
  pdfUrl?: string;
}

export enum UserRole {
  GUEST = 'GUEST',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
}

export interface AIState {
  isLoading: boolean;
  error: string | null;
  generatedContent: string | null;
}
