import { useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { compressImage } from '../utils';
import { X, Upload, Loader2, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MomentImage } from '../types';

interface AddMomentModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumId: string;
}

export default function AddMomentModal({ isOpen, onClose, albumId }: AddMomentModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [momentImages, setMomentImages] = useState<MomentImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (momentImages.length >= 3) {
        setErrorStatus('Limit reached: Max 3 photos per moment.');
        return;
      }
      
      setIsOptimizing(true);
      setErrorStatus(null);
      
      try {
        const optimized = await compressImage(selectedFile, 800, 800, 0.5); // More aggressive compression for multi-photo
        setMomentImages(prev => [...prev, { url: optimized, comment: '' }]);
      } catch (err) {
        console.error('Optimization failed:', err);
        setErrorStatus('Failed to process photo.');
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  const updateComment = (index: number, comment: string) => {
    const newImages = [...momentImages];
    newImages[index].comment = comment;
    setMomentImages(newImages);
  };

  const removeImage = (index: number) => {
    setMomentImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || momentImages.length === 0) return;

    setIsUploading(true);
    setErrorStatus(null);

    try {
      await addDoc(collection(db, 'moments'), {
        albumId,
        date,
        images: momentImages,
        note,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        visibility: 'public',
        createdAt: serverTimestamp(),
      });

      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setMomentImages([]);
      onClose();
    } catch (error) {
      console.error('Failed to save moment:', error);
      setErrorStatus('Failed to save moment. Connection might be weak.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-natural-text/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-natural-bg shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-natural-border px-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-natural-text">Log Moment</h2>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-natural-muted transition-colors hover:bg-natural-border hover:text-natural-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 max-h-[80vh] overflow-y-auto">
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-natural-muted">Date</label>
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="e.g., Day 1, or 2023-10-01"
                      className="w-full rounded-2xl border border-natural-border bg-white px-6 py-4 text-natural-text transition-all focus:border-natural-sage focus:outline-none focus:ring-4 focus:ring-natural-sage/5"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-natural-muted">Photos & Captions (Max 3)</label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {momentImages.map((img, idx) => (
                      <div key={idx} className="relative rounded-3xl border border-natural-border bg-white p-3 shadow-sm">
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-natural-bg">
                          <img src={img.url} alt="Entry" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white shadow-lg transition-transform hover:scale-110"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={img.comment}
                          onChange={(e) => updateComment(idx, e.target.value)}
                          placeholder="Add caption..."
                          className="mt-3 w-full border-none bg-transparent px-2 py-1 text-xs italic text-natural-muted focus:outline-none focus:ring-0"
                        />
                      </div>
                    ))}
                    
                    {momentImages.length < 3 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center rounded-3xl border-2 border-dashed border-natural-border transition-all hover:border-natural-sage hover:bg-natural-sage/5"
                      >
                        {isOptimizing ? (
                          <Loader2 className="animate-spin text-natural-sage" />
                        ) : (
                          <>
                            <Plus className="h-8 w-8 text-natural-border" />
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-natural-muted">Add Photo</p>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-natural-muted">The Story (Note)</label>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Write a detail about this card..."
                    className="w-full resize-none rounded-3xl border border-natural-border bg-white px-6 py-4 text-natural-text transition-all focus:border-natural-sage focus:outline-none focus:ring-4 focus:ring-natural-sage/5"
                    required
                  />
                </div>

                {errorStatus && (
                  <p className="text-center text-xs font-bold text-red-500 uppercase tracking-widest">{errorStatus}</p>
                )}

                <button
                  type="submit"
                  disabled={isUploading || isOptimizing || momentImages.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-natural-sage py-4 font-bold uppercase tracking-widest text-white transition-all hover:bg-natural-sage-hover hover:shadow-lg disabled:opacity-50 disabled:grayscale"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Adding Page...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Save Page
                    </>
                  )}
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
