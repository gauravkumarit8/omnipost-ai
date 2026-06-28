import { useState, useEffect, useCallback } from 'react';

export interface CompanyProfile {
  name: string;
  company: string;
  product: string;
  talking: string;
  competitors: string;
}

export type QueueStatus = 'pending' | 'approved' | 'posted' | 'rejected';

export interface QueueItem {
  id: string;
  articleId: string;
  title: string;
  link: string;
  source: string;
  format: DraftFormat;
  mode: DraftMode;
  text: string;
  status: QueueStatus;
  createdAt: number;
}

export type DraftFormat = 'linkedin' | 'x' | 'blog' | 'medium';
export type DraftMode = 'thought' | 'promo' | 'neutral';

const DEFAULT_PROFILE: CompanyProfile = { name: '', company: '', product: '', talking: '', competitors: '' };

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function writeLS(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export function useNewsStore() {
  const [bookmarks, setBookmarksState] = useState<Set<string>>(new Set());
  const [keywords, setKeywordsState] = useState<string[]>([]);
  const [queue, setQueueState] = useState<QueueItem[]>([]);
  const [profile, setProfileState] = useState<CompanyProfile>(DEFAULT_PROFILE);
  const [darkMode, setDarkModeState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on client
  useEffect(() => {
    setBookmarksState(new Set(readLS<string[]>('tp_bookmarks', [])));
    setKeywordsState(readLS<string[]>('tp_keywords', []));
    setQueueState(readLS<QueueItem[]>('tp_queue', []));
    setProfileState(readLS<CompanyProfile>('tp_profile', DEFAULT_PROFILE));
    setDarkModeState(readLS<boolean>('tp_dark', false));
    setHydrated(true);
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarksState(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      writeLS('tp_bookmarks', [...next]);
      return next;
    });
  }, []);

  const addKeyword = useCallback((kw: string) => {
    setKeywordsState(prev => {
      if (prev.includes(kw)) return prev;
      const next = [...prev, kw];
      writeLS('tp_keywords', next);
      return next;
    });
  }, []);

  const removeKeyword = useCallback((kw: string) => {
    setKeywordsState(prev => {
      const next = prev.filter(k => k !== kw);
      writeLS('tp_keywords', next);
      return next;
    });
  }, []);

  const saveProfile = useCallback((p: CompanyProfile) => {
    setProfileState(p);
    writeLS('tp_profile', p);
  }, []);

  const addToQueue = useCallback((item: Omit<QueueItem, 'id' | 'createdAt' | 'status'>) => {
    setQueueState(prev => {
      const next = [{ ...item, id: 'q' + Date.now(), status: 'pending' as QueueStatus, createdAt: Date.now() }, ...prev];
      writeLS('tp_queue', next);
      return next;
    });
  }, []);

  const setQueueStatus = useCallback((id: string, status: QueueStatus) => {
    setQueueState(prev => {
      const next = prev.map(q => q.id === id ? { ...q, status } : q);
      writeLS('tp_queue', next);
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueueState(prev => {
      const next = prev.filter(q => q.id !== id);
      writeLS('tp_queue', next);
      return next;
    });
  }, []);

  const updateQueueItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setQueueState(prev => {
      const next = prev.map(q => q.id === id ? { ...q, ...updates } : q);
      writeLS('tp_queue', next);
      return next;
    });
  }, []);

  const toggleDark = useCallback(() => {
    setDarkModeState(prev => { writeLS('tp_dark', !prev); return !prev; });
  }, []);

  return {
    hydrated, bookmarks, keywords, queue, profile, darkMode,
    toggleBookmark, addKeyword, removeKeyword, saveProfile,
    addToQueue, setQueueStatus, removeFromQueue, updateQueueItem, toggleDark,
  };
}
