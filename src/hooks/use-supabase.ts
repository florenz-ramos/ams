import { createContext, useContext } from 'react';

export const SupabaseContext = createContext<unknown>(null);

export function useSupabase() {
  return useContext(SupabaseContext);
} 