import { useEffect, useMemo, useState } from 'react';
import { Heart, MapPin, ChevronDown, ChevronLeft, ChevronRight, Medal, Trophy, Camera, Calendar } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { fetchPhotos } from '@/lib/data';
import { formatLikes, basqueName, spotCountryLabel } from '@/lib/utils';
import { Ikurrina } from './Ikurrina';
import type { Photo, Spot } from '@/lib/types';

type Period = 'day' | 'week' | 'month' | 'year';

const LAUNCH_YEAR = 2026;
const LAUNCH_DATE = new Date(LAUNCH_YEAR, 0, 1);
const DAY_MS = 86400000;

const MONTH_NAMES = (() => {
  const names: string[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(2020, m, 15);
    names.push(d.toLocaleDateString(undefined, { month: 'long' }));
  }
  return names;
})();

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
}

function weeksInYear(year: number): number {
  const dec28 = new Date(year, 11, 28);
  return isoWeek(dec28);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function clampDate(d: Date, min: Date, max: Date): Date {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

export function TheBestView() {
  const { t, lang, setTab, setFocusedSpotId, setPhotographerOpen } = useApp();
  const [period, setPeriod] = useState<Period>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date(2026, 9, 27));
  const [photos, setPhotos] = useState<(Photo & { spot?: Spot })[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try { if (alive) setPhotos(await fetchPhotos({ time: 'historic' })); }
      catch { if (alive) setPhotos([]); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const periodLabels: Record<Period, string> = {
    day: t('periodDay'),
    week: t('periodWeek'),
    month: t('periodMonth'),
    year: t('periodYear'),
  };

  const today = useMemo(() => new Date(2026, 9, 27), []);
  const earliest = LAUNCH_DATE;

  const windowStart = useMemo(() => {
    const d = new Date(anchorDate);
    if (period === 'day') d.setHours(0, 0, 0, 0);
    else if (period === 'week') return startOfWeek(d);
    else if (period === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
    else { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d; }
    return d;
  }, [anchorDate, period]);

  const windowEnd = useMemo(() => {
    const d = new Date(windowStart);
    if (period === 'day') d.setDate(d.getDate() + 1);
    else if (period === 'week') d.setDate(d.getDate() + 7);
    else if (period === 'month') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d;
  }, [windowStart, period]);

  const canGoPrev = windowStart > earliest;
  const canGoNext = windowEnd < today;

  const stepPrev = () => {
    if (!canGoPrev) return;
    const d = new Date(anchorDate);
    if (period === 'day') d.setDate(d.getDate() - 1);
    else if (period === 'week') d.setDate(d.getDate() - 7);
    else if (period === 'month') d.setMonth(d.getMonth() - 1);
    else d.setFullYear(d.getFullYear() - 1);
    setAnchorDate(clampDate(d, earliest, today));
  };

  const stepNext = () => {
    if (!canGoNext) return;
    const d = new Date(anchorDate);
    if (period === 'day') d.setDate(d.getDate() + 1);
    else if (period === 'week') d.setDate(d.getDate() + 7);
    else if (period === 'month') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    setAnchorDate(clampDate(d, earliest, today));
  };

  const currentLabel = useMemo(() => {
    if (period === 'day') {
      return anchorDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (period === 'week') {
      const start = windowStart;
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const wk = isoWeek(start);
      const fmtStart = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      const fmtEnd = end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      return `${t('periodWeek')} ${wk} (${fmtStart} – ${fmtEnd})`;
    }
    if (period === 'month') {
      return anchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    return `${t('periodYear')} ${anchorDate.getFullYear()}`;
  }, [anchorDate, period, windowStart, t]);

  const top3 = useMemo(() => {
    const safeTime = (p: Photo): number => {
      if (!p || !p.created_at) return 0;
      const t = new Date(p.created_at).getTime();
      return isNaN(t) ? 0 : t;
    };
    const inWindow = photos.filter((p) => {
      const ts = safeTime(p);
      return ts >= windowStart.getTime() && ts < windowEnd.getTime();
    });
    const pool = inWindow.length >= 1 ? inWindow : [];
    return [...pool].sort((a, b) => b.likes - a.likes).slice(0, 3);
  }, [photos, windowStart, windowEnd]);

  const openInMap = (spotId: string) => {
    setFocusedSpotId(spotId);
    setTab('map');
  };

  const openPhotographer = (author: string) => setPhotographerOpen(author);

  const PodiumCard = ({ photo, rank }: { photo: Photo & { spot?: Spot }; rank: 1 | 2 | 3 }) => {
    const spot = photo.spot;
    const isEus = lang === 'EUS' && spot?.euskal_herria;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
    const ringColor = rank === 1 ? 'ring-amber-400' : rank === 2 ? 'ring-slate-300' : 'ring-orange-400';
    const glow = rank === 1 ? 'shadow-[0_0_28px_rgba(245,158,11,0.45)]' : rank === 2 ? 'shadow-[0_0_18px_rgba(203,213,225,0.4)]' : 'shadow-[0_0_18px_rgba(251,146,60,0.4)]';
    const sizeClass = rank === 1 ? 'sm:scale-110 sm:-translate-y-2' : '';
    const cardSize = rank === 1 ? 'h-64 sm:h-80' : 'h-52 sm:h-64';

    return (
      <div className={`relative rounded-3xl overflow-hidden ring-4 ${ringColor} ${glow} ${sizeClass} bg-forest-50 dark:bg-slate2-850 transition-transform`}>
        <div className={`relative ${cardSize}`}>
          <img src={photo.image_url} alt={spot?.name ?? 'Photo'} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
        </div>
        <div className="absolute top-3 left-3 grid place-items-center w-10 h-10 rounded-full bg-white/90 dark:bg-slate2-900/90 backdrop-blur text-xl shadow-soft">
          {medal}
        </div>
        <div className="absolute bottom-0 inset-x-0 p-4 text-white">
          {spot && (
            <button onClick={() => openInMap(spot.id)} className="block text-left w-full">
              <div className="flex items-center gap-1.5 text-sm font-700">
                <MapPin className="w-3.5 h-3.5 text-terracotta-300 shrink-0" />
                <span className="truncate">{isEus ? basqueName(spot.id, spot.name) : spot.name}</span>
                {isEus && <Ikurrina className="w-3.5 h-2.5 shrink-0" />}
              </div>
              <div className="text-[11px] text-white/70 mt-0.5">{spotCountryLabel(spot, lang)}</div>
            </button>
          )}
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => openPhotographer(photo.author)}
              className="flex items-center gap-1 text-[11px] font-600 hover:text-terracotta-300 transition-colors"
            >
              <Camera className="w-3 h-3" />
              @{photo.author}
            </button>
            <span className="flex items-center gap-1 text-xs font-700">
              <Heart className="w-3 h-3 fill-terracotta-400 text-terracotta-400" />
              {formatLikes(photo.likes)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Title */}
      <div className="mt-6 mb-6 text-center animate-fadeIn">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-700 uppercase tracking-wider">
          <Trophy className="w-4 h-4" />
          {t('hallOfFame')}
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-700 mt-3 text-forest-800 dark:text-sand-100">
          {t('theBest')}
        </h1>
        <p className="mt-2 text-forest-700/70 dark:text-sand-300/70 text-sm">
          {t('palmares')} · {periodLabels[period]} — {currentLabel}
        </p>
      </div>

      {/* Period selector */}
      <div className="flex justify-center mb-5">
        <div className="flex gap-0.5 p-1 rounded-2xl bg-forest-50 dark:bg-slate2-900/60 border border-forest-100 dark:border-slate2-800">
          {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setAnchorDate(clampDate(new Date(anchorDate), earliest, today)); setPickerOpen(false); }}
              className={`px-4 py-2 rounded-xl text-sm font-600 whitespace-nowrap transition-all ${
                period === p
                  ? 'bg-white dark:bg-slate2-800 text-forest-800 dark:text-sand-100 shadow-soft'
                  : 'text-forest-700/70 dark:text-sand-300/70 hover:text-forest-800 dark:hover:text-sand-100'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Time-travel bar */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate2-900 border border-forest-100 dark:border-slate2-800 shadow-soft">
          <button
            onClick={stepPrev}
            disabled={!canGoPrev}
            aria-label={t('previous')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-600 transition-all ${
              canGoPrev
                ? 'text-forest-700 dark:text-sand-200 hover:bg-forest-50 dark:hover:bg-slate2-800'
                : 'text-forest-300 dark:text-slate2-700 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('previous')}</span>
          </button>

          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700 text-forest-800 dark:text-sand-100 hover:bg-forest-50 dark:hover:bg-slate2-800 transition-colors min-w-[180px] justify-center"
          >
            <Calendar className="w-4 h-4 text-amber-500" />
            {currentLabel}
            <ChevronDown className={`w-4 h-4 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={stepNext}
            disabled={!canGoNext}
            aria-label={t('next')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-600 transition-all ${
              canGoNext
                ? 'text-forest-700 dark:text-sand-200 hover:bg-forest-50 dark:hover:bg-slate2-800'
                : 'text-forest-300 dark:text-slate2-700 cursor-not-allowed'
            }`}
          >
            <span className="hidden sm:inline">{t('next')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Period picker */}
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
          <div className="flex justify-center relative mb-4">
            <div className="absolute z-20 w-full max-w-md rounded-2xl bg-white dark:bg-slate2-900 border border-forest-100 dark:border-slate2-800 shadow-lift p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-700 text-forest-800 dark:text-sand-100">{t('jumpTo')}</h3>
                <span className="text-xs text-forest-700/50 dark:text-sand-300/50">{periodLabels[period]}</span>
              </div>

              {period === 'day' && (
                <input
                  type="date"
                  value={anchorDate.toISOString().slice(0, 10)}
                  min={earliest.toISOString().slice(0, 10)}
                  max={today.toISOString().slice(0, 10)}
                  onChange={(e) => {
                    const d = new Date(e.target.value + 'T12:00:00');
                    if (!isNaN(d.getTime())) setAnchorDate(clampDate(d, earliest, today));
                    setPickerOpen(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-forest-50 dark:bg-slate2-800 border border-forest-100 dark:border-slate2-700 text-sm text-forest-800 dark:text-sand-100 focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              )}

              {period === 'week' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-600 text-forest-700/60 dark:text-sand-300/60 mb-1.5">{t('periodYear')}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: today.getFullYear() - LAUNCH_YEAR + 1 }, (_, i) => LAUNCH_YEAR + i).map((y) => (
                        <button
                          key={y}
                          onClick={() => {
                            const d = new Date(anchorDate);
                            d.setFullYear(y);
                            setAnchorDate(clampDate(d, earliest, today));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-600 transition-all ${
                            anchorDate.getFullYear() === y
                              ? 'bg-forest-600 text-white shadow-soft'
                              : 'bg-forest-50 dark:bg-slate2-800 text-forest-700 dark:text-sand-200 hover:bg-forest-100 dark:hover:bg-slate2-700'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-forest-700/60 dark:text-sand-300/60 mb-1.5">{t('periodWeek')}</label>
                    <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                      {Array.from({ length: weeksInYear(anchorDate.getFullYear()) }, (_, i) => i + 1).map((wk) => {
                        const jan4 = new Date(anchorDate.getFullYear(), 0, 4);
                        const start = startOfWeek(new Date(jan4.getTime() + (wk - 1) * 7 * DAY_MS));
                        const isCurrent = isoWeek(windowStart) === wk && windowStart.getFullYear() === anchorDate.getFullYear();
                        const isFuture = start > today;
                        const isPast = start < earliest;
                        const disabled = isFuture || isPast;
                        return (
                          <button
                            key={wk}
                            disabled={disabled}
                            onClick={() => { setAnchorDate(clampDate(start, earliest, today)); setPickerOpen(false); }}
                            className={`px-2 py-1.5 rounded-lg text-xs font-600 transition-all ${
                              isCurrent
                                ? 'bg-forest-600 text-white shadow-soft'
                                : disabled
                                  ? 'text-forest-300 dark:text-slate2-700 cursor-not-allowed'
                                  : 'bg-forest-50 dark:bg-slate2-800 text-forest-700 dark:text-sand-200 hover:bg-forest-100 dark:hover:bg-slate2-700'
                            }`}
                          >
                            {wk}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {period === 'month' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-600 text-forest-700/60 dark:text-sand-300/60 mb-1.5">{t('periodYear')}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: today.getFullYear() - LAUNCH_YEAR + 1 }, (_, i) => LAUNCH_YEAR + i).map((y) => (
                        <button
                          key={y}
                          onClick={() => {
                            const d = new Date(anchorDate);
                            d.setFullYear(y);
                            setAnchorDate(clampDate(d, earliest, today));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-600 transition-all ${
                            anchorDate.getFullYear() === y
                              ? 'bg-forest-600 text-white shadow-soft'
                              : 'bg-forest-50 dark:bg-slate2-800 text-forest-700 dark:text-sand-200 hover:bg-forest-100 dark:hover:bg-slate2-700'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-forest-700/60 dark:text-sand-300/60 mb-1.5">{t('periodMonth')}</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {MONTH_NAMES.map((name, m) => {
                        const test = new Date(anchorDate.getFullYear(), m, 15);
                        const isCurrent = anchorDate.getMonth() === m && anchorDate.getFullYear() === anchorDate.getFullYear();
                        const isFuture = test > today;
                        const disabled = isFuture && anchorDate.getFullYear() === today.getFullYear();
                        return (
                          <button
                            key={m}
                            disabled={disabled}
                            onClick={() => {
                              const d = new Date(anchorDate.getFullYear(), m, 1);
                              setAnchorDate(clampDate(d, earliest, today));
                              setPickerOpen(false);
                            }}
                            className={`px-2 py-2 rounded-lg text-xs font-600 transition-all capitalize ${
                              isCurrent
                                ? 'bg-forest-600 text-white shadow-soft'
                                : disabled
                                  ? 'text-forest-300 dark:text-slate2-700 cursor-not-allowed'
                                  : 'bg-forest-50 dark:bg-slate2-800 text-forest-700 dark:text-sand-200 hover:bg-forest-100 dark:hover:bg-slate2-700'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {period === 'year' && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: today.getFullYear() - LAUNCH_YEAR + 1 }, (_, i) => LAUNCH_YEAR + i).map((y) => (
                    <button
                      key={y}
                      onClick={() => {
                        const d = new Date(y, 0, 1);
                        setAnchorDate(clampDate(d, earliest, today));
                        setPickerOpen(false);
                      }}
                      className={`px-5 py-2.5 rounded-xl text-sm font-700 transition-all ${
                        anchorDate.getFullYear() === y
                          ? 'bg-amber-500 text-white shadow-soft'
                          : 'bg-forest-50 dark:bg-slate2-800 text-forest-700 dark:text-sand-200 hover:bg-forest-100 dark:hover:bg-slate2-700'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Podium */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:gap-5 max-w-3xl mx-auto items-end">
          {[2, 1, 3].map((r) => (
            <div key={r} className={`rounded-3xl shimmer-bg animate-shimmer bg-forest-100/40 dark:bg-slate2-800/40 ${r === 1 ? 'h-80' : 'h-64'}`} />
          ))}
        </div>
      ) : top3.length === 0 ? (
        <div className="py-20 text-center text-forest-700/50 dark:text-sand-300/50 animate-fadeIn">
          <Medal className="w-10 h-10 mx-auto mb-3 text-forest-300 dark:text-slate2-700" />
          <p className="text-sm">{t('noAwardedPhotos')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-5 max-w-3xl mx-auto items-end animate-fadeIn">
          {top3[1] && (
            <div className="order-1">
              <PodiumCard photo={top3[1]} rank={2} />
            </div>
          )}
          {top3[0] && (
            <div className="order-2">
              <PodiumCard photo={top3[0]} rank={1} />
            </div>
          )}
          {top3[2] && (
            <div className="order-3">
              <PodiumCard photo={top3[2]} rank={3} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
