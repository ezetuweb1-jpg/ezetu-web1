import { useState } from 'react';
import { Heart, MapPin, Leaf } from 'lucide-react';
import type { Photo, Spot } from '@/lib/types';
import { useApp } from '@/lib/app-context';
import { formatLikes, basqueName, spotCountryLabel } from '@/lib/utils';
import { isPhotoLiked, togglePhotoLike } from '@/lib/data';

export function PhotoCard({ photo, spot, onSpotClick, allPhotos, photoIndex }: {
  photo: Photo;
  spot?: Spot;
  onSpotClick?: (id: string) => void;
  allPhotos?: (Photo & { spot?: Spot })[];
  photoIndex?: number;
}) {
  const { t, lang, setTab, setPhotographerOpen, openLightbox } = useApp();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(photo.likes);
  const [checked, setChecked] = useState(false);
  const [heart, setHeart] = useState(false);

  if (!checked) {
    isPhotoLiked(photo.id).then((v) => { setLiked(v); setChecked(true); }).catch(() => setChecked(true));
  }

  const aspect = photo.width / photo.height;
  const isEus = lang === 'EUS' && spot?.euskal_herria;

  const onLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setHeart(true);
    setTimeout(() => setHeart(false), 450);
    try { await togglePhotoLike(photo.id, !next); }
    catch { setLiked(!next); setLikeCount(photo.likes); }
  };

  const openPlace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!spot) return;
    if (onSpotClick) onSpotClick(spot.id);
    else setTab('map');
  };

  const openPhotographer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotographerOpen(photo.author);
  };

  const openLight = () => {
    if (allPhotos && photoIndex != null) {
      const spotsMap: Record<string, Spot> = {};
      for (const p of allPhotos) if (p.spot) spotsMap[p.id] = p.spot;
      openLightbox(allPhotos, spot ?? null, photoIndex, { photoSpots: spotsMap });
    } else {
      openLightbox([photo], spot ?? null, 0);
    }
  };

  return (
    <figure className="group relative overflow-hidden rounded-2xl bg-forest-50 dark:bg-slate2-850 shadow-soft hover:shadow-lift transition-shadow animate-riseIn">
      {/* Click 1: Image -> Lightbox */}
      <div className="relative overflow-hidden cursor-pointer" style={{ aspectRatio: aspect }} onClick={openLight}>
        <img
          src={photo.image_url}
          alt={spot?.name ?? 'Landscape'}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-90" />
      </div>

      {/* Single badge: [🌿 Real] */}
      {photo.camera_model && (
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/85 backdrop-blur text-[10px] font-600 text-white">
            <Leaf className="w-2.5 h-2.5" />
            {lang === 'EUS' ? t('realCaptureEu') : t('realCapture')}
          </span>
        </div>
      )}

      {/* Like button top-right */}
      <button
        onClick={onLike}
        aria-label={t('likes')}
        className="absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full bg-white/85 dark:bg-slate2-900/85 backdrop-blur hover:scale-110 active:scale-95 transition-transform"
      >
        <Heart
          className={`w-4 h-4 ${liked ? 'text-terracotta-500 fill-terracotta-500' : 'text-forest-800 dark:text-sand-100'} ${heart ? 'animate-heartbeat' : ''}`}
        />
      </button>

      {/* Bottom info */}
      <figcaption className="absolute bottom-0 inset-x-0 p-3.5 text-white">
        {/* Click 2: Place name -> Detail drawer */}
        {spot && (
          <button onClick={openPlace} className="block text-left w-full group/place">
            <div className="flex items-center gap-1.5 text-sm font-600">
              <MapPin className="w-3.5 h-3.5 text-terracotta-300" />
              <span className="truncate group-hover/place:text-terracotta-300 transition-colors">
                {isEus ? basqueName(spot.id, spot.name) : spot.name}
              </span>
            </div>
            <div className="text-[11px] text-white/70 mt-0.5">{spotCountryLabel(spot, lang)}</div>
          </button>
        )}
        <div className="flex items-center justify-between mt-2">
          {/* Click 3: Photographer name -> Profile */}
          <button
            onClick={openPhotographer}
            className="text-[11px] text-white/70 hover:text-terracotta-300 transition-colors"
          >
            @{photo.author}
          </button>
          <span className="flex items-center gap-1 text-[11px] font-600">
            <Heart className="w-3 h-3 fill-terracotta-400 text-terracotta-400" />
            {formatLikes(likeCount)}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
