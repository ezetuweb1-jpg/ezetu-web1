import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LangCode, ViewTab, Photo, Spot } from './types';
import { makeT } from './i18n';
import { markVisited, unmarkVisited } from './data';

type ThemeMode = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

interface Toast {
  id: number;
  message: string;
  emoji?: string;
}

interface AppCtx {
  mapLayer: 'all' | 'visited' | 'saved';
  setMapLayer: (v: 'all' | 'visited' | 'saved') => void;
  photographerOpen: string | null;
  setPhotographerOpen: (name: string | null) => void;
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (k: string) => string;
  tab: ViewTab;
  setTab: (v: ViewTab) => void;
  uploadOpen: boolean;
  setUploadOpen: (v: boolean) => void;
  addPlaceOpen: boolean;
  setAddPlaceOpen: (v: boolean) => void;
  contributeOpen: boolean;
  setContributeOpen: (v: boolean) => void;
  prefilledComarca: string | null;
  setPrefilledComarca: (v: string | null) => void;
  wishlistOpen: boolean;
  setWishlistOpen: (v: boolean) => void;
  focusedSpotId: string | null;
  setFocusedSpotId: (id: string | null) => void;
  lightboxPhotos: Photo[] | null;
  lightboxSpot: Spot | null;
  lightboxIndex: number;
  lightboxPhotoSpots: Record<string, Spot> | null;
  lightboxViewSpot: ((spot: Spot) => void) | null;
  openLightbox: (photos: Photo[], spot: Spot | null, index: number, opts?: { photoSpots?: Record<string, Spot>; onViewSpot?: (spot: Spot) => void }) => void;
  closeLightbox: () => void;
  spotsRefreshKey: number;
  bumpSpotsRefresh: () => void;
  visitedSpotIds: Set<string>;
  toggleVisited: (spotId: string) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppCtx | null>(null);

const LANG_KEY = 'ezetu.lang';
const THEME_KEY = 'ezetu.theme';
const VISITED_KEY = 'ezetu.visited';

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return mode;
}

function loadVisited(): Set<string> {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch { return new Set(); }
}

function saveVisited(ids: Set<string>) {
  try { localStorage.setItem(VISITED_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
}

export function AppProvider({ children }: { ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    return saved ?? 'auto';
  });
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(localStorage.getItem(THEME_KEY) as ThemeMode | null ?? 'auto'));
  const [lang, setLangState] = useState<LangCode>(() => (localStorage.getItem(LANG_KEY) as LangCode) ?? 'ES');
  const [tab, setTab] = useState<ViewTab>('gallery');
  const [mapLayer, setMapLayer] = useState<'all' | 'visited' | 'saved'>('all');
  const [photographerOpen, setPhotographerOpen] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [prefilledComarca, setPrefilledComarca] = useState<string | null>(null);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [focusedSpotId, setFocusedSpotId] = useState<string | null>(null);
  const [spotsRefreshKey, setSpotsRefreshKey] = useState(0);
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[] | null>(null);
  const [lightboxSpot, setLightboxSpot] = useState<Spot | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxPhotoSpots, setLightboxPhotoSpots] = useState<Record<string, Spot> | null>(null);
  const [lightboxViewSpot, setLightboxViewSpot] = useState<((spot: Spot) => void) | null>(null);
  const [visitedSpotIds, setVisitedSpotIds] = useState<Set<string>>(() => loadVisited());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const bumpSpotsRefresh = useCallback(() => setSpotsRefreshKey((k) => k + 1), []);
  const openLightbox = useCallback((photos: Photo[], spot: Spot | null, index: number, opts?: { photoSpots?: Record<string, Spot>; onViewSpot?: (spot: Spot) => void }) => {
    setLightboxPhotos(photos); setLightboxSpot(spot); setLightboxIndex(index);
    setLightboxPhotoSpots(opts?.photoSpots ?? null);
    setLightboxViewSpot(opts?.onViewSpot ? () => opts.onViewSpot! : null);
  }, []);
  const closeLightbox = useCallback(() => {
    setLightboxPhotos(null); setLightboxPhotoSpots(null); setLightboxViewSpot(null);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, emoji?: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, emoji }]);
    setTimeout(() => dismissToast(id), 3000);
  }, [dismissToast]);

  const toggleVisited = useCallback((spotId: string) => {
    const wasVisited = visitedSpotIds.has(spotId);
    setVisitedSpotIds((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) {
        next.delete(spotId);
        unmarkVisited(spotId).catch(() => {});
      } else {
        next.add(spotId);
        markVisited(spotId).catch(() => {});
      }
      saveVisited(next);
      return next;
    });
    if (!wasVisited) {
      showToast(lang === 'EUS' ? 'Lekua zure Pasaporteara gehitu da' : t('visitedToast'), '🎉');
    }
  }, [visitedSpotIds, showToast, t, lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Track OS preference changes when in auto mode
  useEffect(() => {
    if (themeMode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    setTheme(mq.matches ? 'dark' : 'light');
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m);
    localStorage.setItem(THEME_KEY, m);
    setTheme(resolveTheme(m));
  }, []);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
    document.documentElement.lang = l.toLowerCase();
  }, []);

  useEffect(() => { document.documentElement.lang = lang.toLowerCase(); }, [lang]);

  const t = useMemo(() => makeT(lang), [lang]);
  const toggleTheme = useCallback(() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark'), [themeMode, setThemeMode]);

  const value: AppCtx = {
    mapLayer, setMapLayer,
    photographerOpen, setPhotographerOpen,
    theme, themeMode, setThemeMode, toggleTheme, lang, setLang, t,
    tab, setTab, uploadOpen, setUploadOpen, addPlaceOpen, setAddPlaceOpen, contributeOpen, setContributeOpen, prefilledComarca, setPrefilledComarca, wishlistOpen, setWishlistOpen,
    focusedSpotId, setFocusedSpotId, spotsRefreshKey, bumpSpotsRefresh,
    lightboxPhotos, lightboxSpot, lightboxIndex, lightboxPhotoSpots, lightboxViewSpot, openLightbox, closeLightbox,
    visitedSpotIds, toggleVisited, toasts, dismissToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used within AppProvider');
  return c;
}
