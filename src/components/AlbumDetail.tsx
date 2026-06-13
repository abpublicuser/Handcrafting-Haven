import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Album, Moment, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import AddMomentModal from './AddMomentModal';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Calendar, Trash2, MessageSquare, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function AlbumDetail({ albumId, onBack }: { albumId: string, onBack: () => void }) {
  const [user] = useAuthState(auth);
  const [album, setAlbum] = useState<Album | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMomentOpen, setIsAddMomentOpen] = useState(false);
  const [momentToDelete, setMomentToDelete] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{moment: Moment, imageIndex: number} | null>(null);

  useEffect(() => {
    const fetchAlbum = async () => {
      const docRef = doc(db, 'albums', albumId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAlbum({ id: docSnap.id, ...docSnap.data() } as Album);
      }
    };
    fetchAlbum();

    const q = query(
      collection(db, 'moments'),
      where('albumId', '==', albumId),
      where('visibility', '==', 'public')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const momentData: Moment[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Moment)).sort((a, b) => b.date.localeCompare(a.date));
      setMoments(momentData);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'moments');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [albumId]);

  const handleDeleteMoment = async (momentId: string) => {
    setMomentToDelete(momentId);
  };

  const confirmDeleteMoment = async () => {
    if (!momentToDelete) return;
    try {
      await deleteDoc(doc(db, 'moments', momentToDelete));
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setMomentToDelete(null);
    }
  };

  const handleDeleteSingleImage = async (moment: Moment, imageIndex: number) => {
    setImageToDelete({ moment, imageIndex });
  };

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return;
    const { moment, imageIndex } = imageToDelete;

    try {
      const newImages = moment.images.filter((_, idx) => idx !== imageIndex);
      
      if (newImages.length === 0 && !moment.note?.trim()) {
        await deleteDoc(doc(db, 'moments', moment.id));
      } else {
        await updateDoc(doc(db, 'moments', moment.id), {
          images: newImages
        });
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setImageToDelete(null);
    }
  };

  const isOwner = user && album && user.uid === album.userId;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-natural-muted/20" />
      </div>
    );
  }

  if (!album) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <header className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-natural-muted transition-colors hover:text-natural-sage"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Albums
        </button>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 overflow-hidden rounded-3xl shadow-xl ring-4 ring-white">
              <img src={album.coverImageUrl} alt={album.name} className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-4xl font-medium tracking-tight text-natural-text sm:text-6xl">{album.name}</h1>
              <p className="mt-2 text-lg italic text-natural-muted">by {album.userName}</p>
            </div>
          </div>

          {isOwner && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAddMomentOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-natural-sage px-8 py-4 font-bold uppercase tracking-widest text-white shadow-lg shadow-natural-sage/10 transition-all hover:bg-natural-sage-hover"
            >
              <Plus className="h-5 w-5" />
              Add Moment
            </motion.button>
          )}
        </div>
      </header>

      <div className="space-y-16">
        {moments.length === 0 ? (
          <div className="flex h-[30vh] flex-col items-center justify-center gap-4 text-natural-muted/20">
            <ImageIcon className="h-12 w-12" />
            <p className="text-xl font-medium">No moments captured yet.</p>
          </div>
        ) : (
          moments.map((moment) => (
            <motion.section
              key={moment.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative border-l-2 border-natural-border pl-8 sm:pl-12"
            >
              <div className="absolute -left-[11px] top-0 h-5 w-5 rounded-full border-4 border-natural-bg bg-natural-sage shadow-sm shadow-natural-sage/40" />
              
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-natural-sage/10 text-natural-sage">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-natural-text">
                      {(()=>{
                        const d = new Date(moment.date + 'T00:00:00');
                        if (!isNaN(d.getTime())) {
                          return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                        }
                        const d2 = new Date(moment.date);
                        if (!isNaN(d2.getTime())) {
                          return d2.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                        }
                        return moment.date;
                      })()}
                    </p>
                    <p className="text-xs italic text-natural-muted">Shared by {moment.userName}</p>
                  </div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => handleDeleteMoment(moment.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-400 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {moment.images.map((img, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-natural-border transition-all hover:shadow-xl">
                    <div className="aspect-square relative overflow-hidden">
                      <img src={img.url} alt={`Moment ${idx}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteSingleImage(moment, idx)}
                          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-500 group-hover:opacity-100"
                          title="Delete Photo"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    {img.comment && (
                      <div className="p-6">
                        <div className="flex gap-3">
                          <MessageSquare className="h-4 w-4 shrink-0 text-natural-tan" />
                          <p className="text-sm italic text-natural-muted leading-relaxed">{img.comment}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {moment.note && (
                <div className="mt-8 max-w-2xl rounded-3xl bg-natural-tan/5 p-8 italic text-natural-text ring-1 ring-natural-tan/10">
                  <p className="leading-relaxed">"{moment.note}"</p>
                </div>
              )}
            </motion.section>
          ))
        )}
      </div>

      <AddMomentModal 
        isOpen={isAddMomentOpen}
        onClose={() => setIsAddMomentOpen(false)}
        albumId={albumId}
      />

      <AnimatePresence>
        {momentToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            >
              <h3 className="mb-2 text-xl font-bold text-natural-text">Delete Moment?</h3>
              <p className="mb-6 text-sm leading-relaxed text-natural-muted">
                Are you sure you want to delete this moment? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMomentToDelete(null)}
                  className="flex-1 rounded-full bg-natural-sage/10 py-2.5 font-bold text-natural-sage transition-colors hover:bg-natural-sage/20"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMoment}
                  className="flex-1 rounded-full bg-red-500 py-2.5 font-bold text-white transition-colors hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {imageToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            >
              <h3 className="mb-2 text-xl font-bold text-natural-text">Delete Photo?</h3>
              <p className="mb-6 text-sm leading-relaxed text-natural-muted">
                Are you sure you want to delete this photo? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setImageToDelete(null)}
                  className="flex-1 rounded-full bg-natural-sage/10 py-2.5 font-bold text-natural-sage transition-colors hover:bg-natural-sage/20"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteImage}
                  className="flex-1 rounded-full bg-red-500 py-2.5 font-bold text-white transition-colors hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
