import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomSocket } from '../../hooks/useRoomSocket';
import { useAuthStore } from '../../store/authStore';

interface Track {
  id: number;
  title: string;
  artist: string;
  coverUrl?: string;
  mediaUrl: string;
  duration: string;
  type: 'AUDIO' | 'VIDEO';
  isPopular: boolean;
  createdAt: string;
}

type Tab = 'popular' | 'favorite' | 'history' | 'search';

interface Props {
  open: boolean;
  onClose: () => void;
  type: 'AUDIO' | 'VIDEO';
}

export default function MusicModal({ open, onClose, type }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('popular');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [search, setSearch] = useState('');
  const { selectMedia } = useRoomSocket();

  useEffect(() => {
    if (!open) return;
    const fetchTracks = async () => {
      try {
        let url = `/api/music/popular?type=${type}`;
        if (activeTab === 'search' && search) {
          url = `/api/music/search?type=${type}&q=${encodeURIComponent(search)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) setTracks(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchTracks();
  }, [open, type, activeTab, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-lime text-white rounded-full flex items-center justify-center font-bold text-lg active:scale-95"
        >
          ×
        </button>

        <div className="flex items-center justify-center gap-6 pt-6 pb-2 border-b border-gray-100">
          <button onClick={() => setActiveTab('popular')} className={`text-2xl ${activeTab === 'popular' ? 'opacity-100 scale-110' : 'opacity-40 filter grayscale'}`}>🔥</button>
          <button onClick={() => setActiveTab('favorite')} className={`text-2xl ${activeTab === 'favorite' ? 'opacity-100 scale-110' : 'opacity-40 filter grayscale'}`}>⭐</button>
          <button onClick={() => setActiveTab('history')} className={`text-2xl ${activeTab === 'history' ? 'opacity-100 scale-110' : 'opacity-40 filter grayscale'}`}>🕒</button>
          <button onClick={() => setActiveTab('search')} className={`text-2xl ${activeTab === 'search' ? 'opacity-100 scale-110' : 'opacity-40 filter grayscale'}`}>🔍</button>
        </div>

        <div className="px-4 py-2 text-gray-400 text-sm font-medium">
          {activeTab === 'popular' ? 'Поставить музыку из популярного' : 
           activeTab === 'search' ? 'Поиск треков' : 'Список треков'}
        </div>

        {activeTab === 'search' && (
          <div className="px-4 pb-2">
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-4 py-2 outline-none text-black"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {type === 'VIDEO' ? (
            <div className="grid grid-cols-2 gap-3">
              {tracks.map(t => (
                <div key={t.id} onClick={() => { selectMedia(t.id); onClose(); }} className="cursor-pointer group">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200">
                    <img src={t.coverUrl || ''} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {t.duration}
                    </div>
                    <div className="absolute top-1 right-1 text-white text-lg opacity-70 group-hover:opacity-100">
                      ⭐
                    </div>
                  </div>
                  <div className="mt-1 leading-tight">
                    <div className="text-sm text-black font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-gray-500 truncate">{t.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tracks.map(t => (
                <div key={t.id} onClick={() => { selectMedia(t.id); onClose(); }} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-black font-bold truncate">{t.title}</div>
                    <div className="text-xs text-gray-500 truncate">{t.artist}</div>
                  </div>
                  <div className="text-xs text-gray-400">{t.duration}</div>
                  <div className="text-gray-300 hover:text-yellow-400 text-lg">⭐</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
