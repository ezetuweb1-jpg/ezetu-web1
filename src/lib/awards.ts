import type { Photo, PhotoAward, AwardPeriod, AwardRank } from './types';

const DAY_MS = 86400000;

function safePhotoTime(p: Photo): number {
  if (!p || !p.created_at) return 0;
  const t = new Date(p.created_at).getTime();
  return isNaN(t) ? 0 : t;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function windowStart(anchor: Date, period: AwardPeriod): Date {
  const d = new Date(anchor);
  if (period === 'day') d.setHours(0, 0, 0, 0);
  else if (period === 'week') return startOfWeek(d);
  else if (period === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  else { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d; }
}

function windowEnd(start: Date, period: AwardPeriod): Date {
  const d = new Date(start);
  if (period === 'day') d.setDate(d.getDate() + 1);
  else if (period === 'week') d.setDate(d.getDate() + 7);
  else if (period === 'month') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
}

function periodLabel(start: Date, period: AwardPeriod): string {
  if (period === 'day') return start.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  if (period === 'week') return `W${isoWeek(start)}`;
  if (period === 'month') return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return `${start.getFullYear()}`;
}

export interface AwardedPhoto {
  photo: Photo;
  awards: PhotoAward[];
}

/**
 * Given a pool of photos and a "today" anchor, find every photo that lands on
 * a podium (rank 1–3) for any period (day/week/month/year) and return it with
 * its awards. A photo can win multiple medals; we keep the best one per period.
 */
export function computeAwardedPhotos(photos: Photo[], today: Date): AwardedPhoto[] {
  const byId = new Map<string, AwardedPhoto>();

  for (const period of ['day', 'week', 'month', 'year'] as AwardPeriod[]) {
    // Walk the anchor backwards from today to the earliest photo, stepping one
    // period at a time, and find the podium for each window.
    const earliest = photos.length
      ? new Date(Math.min(...photos.map((p) => safePhotoTime(p))))
      : today;
    earliest.setHours(0, 0, 0, 0);

    let anchor = new Date(today);
    // Clamp anchor to a clean window boundary so we don't miss partial windows.
    anchor = windowStart(anchor, period);

    while (anchor.getTime() >= earliest.getTime() - DAY_MS) {
      const ws = windowStart(anchor, period);
      const we = windowEnd(ws, period);
      const inWindow = photos
        .filter((p) => {
          const ts = safePhotoTime(p);
          return ts >= ws.getTime() && ts < we.getTime();
        })
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 3);

      inWindow.forEach((p, idx) => {
        const rank = (idx + 1) as AwardRank;
        const award: PhotoAward = { period, rank, periodLabel: periodLabel(ws, period) };
        const existing = byId.get(p.id);
        if (existing) {
          // Keep the highest-rank (lowest number) award per period, or add a new period.
          const hasPeriod = existing.awards.find((a) => a.period === period);
          if (!hasPeriod) existing.awards.push(award);
          else if (rank < hasPeriod.rank) {
            existing.awards[existing.awards.indexOf(hasPeriod)] = award;
          }
        } else {
          byId.set(p.id, { photo: p, awards: [award] });
        }
      });

      // Step anchor back one period.
      const d = new Date(anchor);
      if (period === 'day') d.setDate(d.getDate() - 1);
      else if (period === 'week') d.setDate(d.getDate() - 7);
      else if (period === 'month') d.setMonth(d.getMonth() - 1);
      else d.setFullYear(d.getFullYear() - 1);
      anchor = d;
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const bestA = Math.min(...a.awards.map((aw) => aw.rank));
    const bestB = Math.min(...b.awards.map((aw) => aw.rank));
    if (bestA !== bestB) return bestA - bestB;
    return b.photo.likes - a.photo.likes;
  });
}

export function medalForRank(rank: AwardRank): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
}
