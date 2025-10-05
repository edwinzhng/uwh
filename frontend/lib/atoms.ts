import { atom } from 'jotai';

// User state
export const userAtom = atom<{ id: number; name: string; email: string } | null>(null);

// API base URL
export const apiBaseUrlAtom = atom(
  process.env.NODE_ENV === 'production' 
    ? 'https://uwh-api.vercel.app' 
    : 'http://localhost:3101'
);

// Loading states
export const isLoadingAtom = atom(false);
export const errorAtom = atom<string | null>(null);
