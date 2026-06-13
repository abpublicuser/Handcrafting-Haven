import { Album, Moment } from '../types';
import { db } from '../firebase';
import { doc, deleteDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Trash2, Image as ImageIcon, Plus, Edit2, PencilLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useMemo, useEffect } from 'react';
import AddMomentModal from './AddMomentModal';
import EditMomentModal from './EditMomentModal';
import ImageModal from './ImageModal';
import EditAlbumModal from './EditAlbumModal';

interface AlbumCardProps {
  album: Album;
  onClick?: (id: string) => void;
  isOwnerView?: boolean;
}

export default function AlbumCard({ album, onClick, isOwnerView }: AlbumCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isAddMomentOpen, setIsAddMomentOpen] = useState(false);
  const [isEditAlbumOpen, setIsEditAlbumOpen] = useState(false);
  const [selectedMomentToEdit, setSelectedMomentToEdit] = useState<Moment | null>(null);
  const [selectedImage, setSelectedImage] = useState<{url: string, comment?: string} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [momentToDelete, setMomentToDelete] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{moment: Moment, imageIndex: number} | null>(null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAlbum = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'albums', album.id));
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const q = query(
      collection(db, 'moments'),
      where('albumId', '==', album.id),
      where('visibility', '==', 'public')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const momentData: Moment[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Moment));
      
      if (isMounted) {
        setMoments(momentData);
        setIsLoadingImages(false);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [album.id]);

  const sortedMoments = useMemo(() => {
    return [...moments].sort((a, b) => a.date.localeCompare(b.date));
  }, [moments]);

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(album.id);
  };

  const handleDeleteMoment = async (e: React.MouseEvent, momentId: string) => {
    e.stopPropagation();
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

  const handleDeleteSingleImage = async (e: React.MouseEvent, moment: Moment, imageIndex: number) => {
    e.stopPropagation();
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="overflow-hidden rounded-3xl bg-white ring-1 ring-natural-border shadow-sm transition-shadow hover:shadow-md"
    >
      <div 
        className="relative flex min-h-[180px] sm:min-h-[240px] select-none flex-col justify-end overflow-hidden p-5 sm:p-6 md:p-8"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={album.coverImageUrl}
            alt={album.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        </div>

        <div className="relative z-10 flex items-end justify-between gap-4 w-full">
          <div className="flex flex-1 flex-col justify-end">
            <h3 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl drop-shadow-md">
              {album.name}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium text-white/80 drop-shadow-sm">by {album.userName}</span>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center justify-end gap-3 pb-2">
            {isOwnerView && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditAlbumOpen(true); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-natural-text"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-natural-border">
        <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-natural-text">Album Memories</h4>
                <div className="flex flex-wrap items-center gap-2">
                  {isOwnerView && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsAddMomentOpen(true); }}
                      className="flex items-center gap-1.5 rounded-xl bg-natural-sage/10 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-natural-sage transition-colors hover:bg-natural-sage hover:text-white"
                    >
                      <Plus className="h-3 w-3" />
                      Add Pages
                    </button>
                  )}
                  {onClick && (
                    <button
                      onClick={handleActionClick}
                      className="flex items-center gap-1.5 rounded-xl bg-natural-sage/10 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-natural-sage transition-colors hover:bg-natural-sage hover:text-white"
                    >
                      View Details
                    </button>
                  )}
                  {isOwnerView && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      title="Delete Album"
                      className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete Album
                    </button>
                  )}
                </div>
              </div>

              {isLoadingImages ? (
                <div className="flex h-24 items-center justify-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-natural-muted/50 animate-pulse">Loading Memories...</div>
                </div>
              ) : sortedMoments.length > 0 ? (
                <div className="flex flex-col gap-8">
                  {sortedMoments.map((moment) => {
                    const dateObj = new Date(moment.date + 'T00:00:00');
                    let formattedDate = moment.date;
                    if (!isNaN(dateObj.getTime())) {
                      formattedDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                    
                    return (
                      <div key={moment.id} className="space-y-4 relative">
                        <div className="flex items-center gap-4">
                          <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-natural-muted shrink-0 relative z-10 bg-white pr-4">
                             {formattedDate}
                          </h5>
                          <div className="h-px bg-natural-border flex-1"></div>
                          {isOwnerView && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedMomentToEdit(moment); }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-natural-sage/10 text-natural-sage hover:bg-natural-sage hover:text-white transition-all"
                                title="Edit Page"
                              >
                                <PencilLine className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteMoment(e, moment.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                title="Delete Page"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {moment.note && (
                          <div className="relative overflow-hidden rounded-2xl bg-natural-sage/5 p-5 border border-natural-sage/20 shadow-sm sm:p-6 text-base italic leading-relaxed text-natural-text">
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-natural-sage"></div>
                            {moment.note}
                          </div>
                        )}
                        {moment.images.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {moment.images.map((img, idx) => (
                              <div 
                                key={idx} 
                                onClick={(e) => { e.stopPropagation(); setSelectedImage(img); }}
                                className="cursor-pointer group relative flex flex-col gap-2"
                              >
                                <div className="aspect-[4/3] relative overflow-hidden rounded-xl bg-natural-bg ring-1 ring-black/5">
                                  <img src={img.url} alt={`Memory ${idx}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                  
                                  {isOwnerView && (
                                    <button
                                      onClick={(e) => handleDeleteSingleImage(e, moment, idx)}
                                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-500 group-hover:opacity-100"
                                      title="Delete Photo"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                {img.comment && (
                                  <p className="text-sm font-medium text-natural-text line-clamp-2 px-1">{img.comment}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-24 flex-col items-center justify-center gap-2 text-natural-muted/30">
                  <ImageIcon className="h-6 w-6" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No photos yet</p>
                </div>
              )}
            </div>
      </div>

      {isOwnerView && (
        <AddMomentModal 
          isOpen={isAddMomentOpen} 
          onClose={() => setIsAddMomentOpen(false)} 
          albumId={album.id} 
        />
      )}

      {isOwnerView && (
        <EditMomentModal
          isOpen={!!selectedMomentToEdit}
          onClose={() => setSelectedMomentToEdit(null)}
          moment={selectedMomentToEdit}
        />
      )}

      {isOwnerView && (
        <EditAlbumModal 
          isOpen={isEditAlbumOpen} 
          onClose={() => setIsEditAlbumOpen(false)} 
          album={album} 
        />
      )}

      <AnimatePresence>
        {selectedImage && (
          <ImageModal 
            imageUrl={selectedImage.url} 
            comment={selectedImage.comment}
            onClose={() => setSelectedImage(null)} 
          />
        )}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            >
              <h3 className="mb-2 text-xl font-bold text-natural-text">Delete Album?</h3>
              <p className="mb-6 text-sm leading-relaxed text-natural-muted">
                Are you sure you want to delete this album and all its pages? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-full bg-natural-sage/10 py-2.5 font-bold text-natural-sage transition-colors hover:bg-natural-sage/20"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAlbum}
                  disabled={isDeleting}
                  className="flex-1 rounded-full bg-red-500 py-2.5 font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {momentToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            >
              <h3 className="mb-2 text-xl font-bold text-natural-text">Delete Page?</h3>
              <p className="mb-6 text-sm leading-relaxed text-natural-muted">
                Are you sure you want to delete this page? This action cannot be undone.
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
