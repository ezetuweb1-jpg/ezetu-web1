import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Flag, Camera, MapPin, Leaf } from 'lucide-react';
import type { Photo, Spot } from '@/lib/types';
import { useApp } from '@/lib/app-context';
import { formatLikes, basqueName } from '@/lib/utils';
import { isPhotoLiked, togglePhotoLike } from '@/lib/data';
import { ReportModal } from './ReportModal';

interface Props {
  photos: Photo[];
  spot?: Spot;
  startIndex: number;
  onClose: () => void;
  /** Per-photo spot lookup; when provided, the "View place info" bridge button is shown. */
  photoSpots?: Record<string, Spot>;
  /** Called when the user taps "View place info"; receives the spot for the current photo. */
  onViewSpot?: (spot: Spot) => void;
}

export function LightboxModal({ photos, spot, startIndex, onClose, photoSpots, onViewSpot }: Props) {
  const { t, lang, setPhotographerOpen, setFocusedSpotId, setTab } = useApp();
  const [index, setIndex] = useState(startIndex);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [checked, setChecked] = useState(false);
  const [heart, setHeart] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const photo = photos[index];

  useEffect(() => {
    setLiked(false);
    setChecked(false);
    setLikeCount(photo?.likes ?? 0);
  }, [index, photo]);

  useEffect(() => {
    if (!photo || checked) return;
    isPhotoLiked(photo.id).then((v) => { setLiked(v); setChecked(true); }).catch(() => setChecked(true));
  }, [photo, checked]);

  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (reportOpen) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose, reportOpen]);

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) { diff > 0 ? prev() : next(); }
    setTouchStart(null);
  };

  if (!photo) return null;

  const currentSpot = (photoSpots?.[photo.id] ?? spot) as Spot | undefined;
  const isEus = lang === 'EUS' && currentSpot?.euskal_herria;
  const spotName = currentSpot ? (isEus ? basqueName(currentSpot.id, currentSpot.name) : currentSpot.name) : '';

  const onLike = async () => {
    const nextVal = !liked;
    setLiked(nextVal);
    setLikeCount((c) => Math.max(0, c + (nextVal ? 1 : -1)));
    setHeart(true);
    setTimeout(() => setHeart(false), 450);
    try { await togglePhotoLike(photo.id, !nextVal); }
    catch { setLiked(!nextVal); setLikeCount(photo.likes); }
  };

  const openSpotDrawer = () => {
    if (!currentSpot) return;
    if (onViewSpot) { onViewSpot(currentSpot); return; }
    onClose();
    setFocusedSpotId(currentSpot.id);
    setTab('map');
  };

  const openPhotographer = () => {
    setPhotographerOpen(photo.author);
    onClose();
  };

  const exifParts = [
    photo.camera_model,
    photo.lens,
    photo.aperture,
    photo.shutter_speed,
    photo.iso != null ? `ISO ${photo.iso}` : null,
  ].filter(Boolean);

  const photoDate = photo.created_at
    ? new Date(photo.created_at).toLocaleDateString(lang === 'EUS' ? 'eu' : lang === 'EN' ? 'en' : lang === 'FR' ? 'fr' : lang === 'DE' ? 'de' : 'es', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <>
      <div
        className="fixed inset-0 z-[3200] bg-black/95 animate-fadeIn flex flex-col"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
          <div className="flex items-center gap-2 text-sm font-600">
            {spotName && <span className="truncate max-w-[200px]">{spotName}</span>}
            {photos.length > 1 && <span className="text-white/50 text-xs">{index + 1} / {photos.length}</span>}
          </div>
          <button onClick={onClose} className="grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main image */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden px-4 min-h-0">
          <img
            src={photo.image_url}
            alt={spotName || 'Photo'}
            className="max-w-full max-h-full object-contain rounded-lg animate-fadeIn"
            key={photo.id}
          />

          {/* Floating nav arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/25 hover:scale-110 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/25 hover:scale-110 active:scale-95 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Bottom info panel */}
        <div className="shrink-0 px-4 pb-4 pt-3 text-white">
          <div className="max-w-3xl mx-auto">
            {/* Primary row: Like + Author + Place */}
            <div className="flex items-center gap-3 mb-3">
              {/* Prominent Like button */}
              <button
                onClick={onLike}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-terracotta-500/20 hover:bg-terracotta-500/30 border border-terracotta-400/30 transition-all text-sm font-700 shrink-0"
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-terracotta-500 text-terracotta-500' : 'text-terracotta-300'} ${heart ? 'animate-heartbeat' : ''}`} />
                {formatLikes(likeCount)}
              </button>

              {/* Author with avatar */}
              <button
                onClick={openPhotographer}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-600 min-w-0"
              >
                <span className="grid place-items-center w-7 h-7 rounded-full bg-white/15 backdrop-blur text-xs font-700 shrink-0">
                  {photo.author.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">@{photo.author}</span>
              </button>

              {/* Place with pin */}
              {currentSpot && (
                <button
                  onClick={openSpotDrawer}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-600 min-w-0"
                >
                  <MapPin className="w-4 h-4 shrink-0 text-terracotta-300" />
                  <span className="truncate">{spotName}</span>
                </button>
              )}

              {/* Report */}
              <button
                onClick={() => setReportOpen(true)}
                className="grid place-items-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                title={t('reportPhoto')}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* [🌿 Real] badge */}
            {photo.camera_model && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/85 backdrop-blur text-[11px] font-600 text-white">
                  <Leaf className="w-3 h-3" />
                  {lang === 'EUS' ? t('realCaptureEu') : t('realCapture')}
                </span>
              </div>
            )}

            {/* Bridge: View place info */}
            {currentSpot && onViewSpot && (
              <button
                onClick={() => onViewSpot(currentSpot)}
                className="flex items-center gap-2 w-full px-4 py-3 mb-3 rounded-2xl bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-500 hover:to-forest-600 text-white text-sm font-700 transition-all shadow-soft"
              >
                <MapPin className="w-4 h-4 shrink-0 text-terracotta-300" />
                <span className="flex-1 text-left truncate">
                  {t('viewSpotInfo')}: {spotName}
                </span>
              </button>
            )}

            {/* EXIF technical metadata */}
            {exifParts.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-white/60">
                <Camera className="w-3.5 h-3.5 shrink-0" />
                {exifParts.map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-white/8">{p}</span>
                ))}
                {photoDate && <span className="px-2 py-0.5 rounded-full bg-white/8">{photoDate}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
      {reportOpen && <ReportModal photoId={photo.id} onClose={() => setReportOpen(false)} />}
    </>
  );
}
