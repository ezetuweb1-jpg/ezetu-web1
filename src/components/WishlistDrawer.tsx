import { X, Bookmark, MapPin, Footprints } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { useSpots, useWishlist } from '@/lib/data';
import { flagEmoji, basqueName, spotCountryLabel } from '@/lib/utils';
import { Ikurrina } from './Ikurrina';

export function WishlistDrawer({ onClose, onOpenSpot }: { onClose: () => void; onOpenSpot: (id: string) => void }) {
  const { t, lang } = useApp();
  const { spots } = useSpots();
  const { items, savedIds } = useWishlist();

  const savedSpots = spots.filter((s) => savedIds.has(s.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full sm:max-w-md h-full bg-sand-50 dark:bg-slate2-900 shadow-lift flex flex-col animate-popIn">
        <div className="flex items-center justify-between p-5 border-b border-forest-100 dark:border-slate2-800">
          <h2 className="font-display text-xl font-700 text-forest-800 dark:text-sand-100 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-terracotta-500 fill-terracotta-500" />
            {t('saved')} ({savedSpots.length})
          </h2>
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-full hover:bg-forest-100 dark:hover:bg-slate2-800 text-forest-700 dark:text-sand-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {savedSpots.length === 0 ? (
            <div className="grid place-items-center h-full text-center px-6">
              <div>
                <Bookmark className="w-10 h-10 text-forest-300 dark:text-slate2-700 mx-auto mb-2" />
                <p className="text-sm text-forest-700/60 dark:text-sand-300/60">{t('noSaved')}</p>
              </div>
            </div>
          ) : (
            savedSpots.map((s) => {
              const isEus = lang === 'EUS' && s.euskal_herria;
              return (
              <button
                key={s.id}
                onClick={() => { onOpenSpot(s.id); onClose(); }}
                className="w-full flex gap-3 p-3 rounded-2xl bg-white dark:bg-slate2-850 border border-forest-100 dark:border-slate2-800 hover:border-forest-300 dark:hover:border-slate2-700 transition-colors text-left"
              >
                <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-forest-100 dark:bg-slate2-800">
                  {s.cover_photo && <img src={s.cover_photo.image_url} alt={s.name} loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-600 text-sm text-forest-800 dark:text-sand-100 truncate">{isEus ? basqueName(s.id, s.name) : s.name}</h3>
                  <p className="text-xs text-forest-700/60 dark:text-sand-300/60 truncate flex items-center gap-1">
                    {isEus ? <Ikurrina className="w-3 h-1.5" /> : <span>{flagEmoji(s.country_code)}</span>} {spotCountryLabel(s, lang)}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-terracotta-100 dark:bg-terracotta-900/30 text-terracotta-700 dark:text-terracotta-300 font-600 mt-1 inline-block">
                    {s.category === 'city' ? '🏙️' : s.category === 'village' ? '🏘️' : '🌲'}
                  </span>
                </div>
              </button>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
