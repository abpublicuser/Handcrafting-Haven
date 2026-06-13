import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Album, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import AlbumCard from './AlbumCard';
import AlbumDetail from './AlbumDetail';
import CreateAlbumModal from './CreateAlbumModal';
import CreateAlbumFromDraftModal from './CreateAlbumFromDraftModal';
import { AnimatePresence, motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { Compass, Loader2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function MyAlbums() {
  const [user] = useAuthState(auth);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedDropdownAlbumId, setSelectedDropdownAlbumId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateDraftModalOpen, setIsCreateDraftModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'albums'),
      where('userId', '==', user.uid)
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
      setError(`Sync issue: ${err.message || 'Unknown error'}`);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  if (selectedAlbumId) {
    return <AlbumDetail albumId={selectedAlbumId} onBack={() => setSelectedAlbumId(null)} />;
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-natural-muted/20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-natural-muted px-8 text-center">
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
        <div className="w-full max-w-sm">
          <label htmlFor="my-album-select" className="block text-sm font-bold uppercase tracking-widest text-natural-muted mb-2">
            Select an Album
          </label>
          <select
            id="my-album-select"
            value={selectedDropdownAlbumId}
            onChange={(e) => {
              if (e.target.value === 'new_album') {
                setIsCreateModalOpen(true);
                return;
              }
              if (e.target.value === 'new_album_from_draft') {
                setIsCreateDraftModalOpen(true);
                return;
              }
              setSelectedDropdownAlbumId(e.target.value);
            }}
            className="w-full rounded-xl border border-natural-border bg-white px-4 py-3 text-natural-text focus:border-natural-sage focus:outline-none focus:ring-2 focus:ring-natural-sage/20"
          >
            <option value="" disabled>-- Choose an album --</option>
            <option value="new_album" className="font-bold text-natural-sage">
              + New Album
            </option>
            <option value="new_album_from_draft" className="font-bold text-natural-sage">
              + New Album from Draft
            </option>
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
          <Compass className="h-16 w-16" />
          <p className="text-xl font-medium">No albums yet.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-sm font-bold uppercase tracking-widest text-natural-sage hover:underline"
          >
            Start your first album
          </button>
        </div>
      ) : !selectedDropdownAlbumId ? (
        <div className="flex flex-col items-center justify-center gap-6 text-center mt-12 mb-16 py-12 px-4 rounded-3xl bg-white border border-natural-border shadow-sm">
          <h1 className="text-4xl font-bold tracking-tight text-natural-text sm:text-5xl">
            Your <span className="text-natural-sage">Albums</span>
          </h1>
          <p className="max-w-xl text-lg text-natural-muted leading-relaxed">
            Manage your card creations, edit your past designs, and expand your portfolio. Select an album from the dropdown above to view or update it, or create a new one.
          </p>
          <Compass className="h-20 w-20 opacity-20 text-natural-sage mt-2" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {albums.filter(t => t.id === selectedDropdownAlbumId).map((album) => (
              <AlbumCard 
                key={album.id} 
                album={album} 
                onClick={(id) => setSelectedAlbumId(id)}
                isOwnerView={true}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreateAlbumModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(albumId) => {
          setIsCreateModalOpen(false);
          setSelectedAlbumId(albumId);
        }}
      />
      <CreateAlbumFromDraftModal
        isOpen={isCreateDraftModalOpen}
        onClose={() => setIsCreateDraftModalOpen(false)}
        onSuccess={(albumId) => {
          setIsCreateDraftModalOpen(false);
          setSelectedAlbumId(albumId);
        }}
      />
    </motion.div>
  );
}
