import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Album, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import AlbumCard from './AlbumCard';
import { AnimatePresence, motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { Map as MapIcon, Loader2 } from 'lucide-react';
import logo from '../assets/images/globe_trotter_logo_1781195701047.jpg';

export default function Explore() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'albums'),
      where('visibility', '==', 'public')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const albumData: Album[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Album)).sort((a, b) => {
        return b.name.localeCompare(a.name);
      });
      setAlbums(albumData);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'albums');
      setIsLoading(false);
      setError(`Connection issue: ${err.message || 'Unknown error'}`);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-natural-muted/20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-natural-muted">
        <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs font-bold uppercase tracking-widest text-natural-sage underline"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div className="w-full">
          <label htmlFor="album-select" className="block text-sm font-bold uppercase tracking-widest text-natural-muted mb-2">
            Select an Album
          </label>
          <select
            id="album-select"
            value={selectedAlbumId}
            onChange={(e) => setSelectedAlbumId(e.target.value)}
            className="w-full rounded-xl border border-natural-border bg-white px-4 py-3 text-natural-text focus:border-natural-sage focus:outline-none focus:ring-2 focus:ring-natural-sage/20"
          >
            <option value="" disabled>-- Choose an album --</option>
            {albums.map(album => {
              return (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              );
            })}
          </select>
        </div>
      </header>

      {albums.length === 0 ? (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-4 text-natural-muted/20">
          <MapIcon className="h-16 w-16" />
          <p className="text-xl font-medium">No albums shared yet.</p>
        </div>
      ) : !selectedAlbumId ? (
        <div className="flex flex-col items-center justify-center gap-6 text-center mt-12 mb-16 py-16 px-4 rounded-3xl bg-white border border-natural-border shadow-sm">
          <h2 className="text-3xl font-medium tracking-tight text-natural-text sm:text-4xl mb-2">Welcome to</h2>
          <div className="relative h-48 w-48 sm:h-56 sm:w-56 overflow-hidden rounded-full shadow-md border-4 border-white">
            <img 
              src={logo} 
              alt="Handcrafting Haven Logo" 
              className="h-full w-full object-cover scale-105" 
            />
          </div>
          <p className="max-w-xl text-lg text-natural-muted leading-relaxed mt-4">
            Explore a visual journey through our handmade card collections. Select an album from the dropdown above to view our creations.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {albums.filter(a => a.id === selectedAlbumId).map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
