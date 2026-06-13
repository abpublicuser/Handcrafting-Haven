import { useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { compressImage } from '../utils';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (albumId: string) => void;
}

export default function CreateAlbumModal({ isOpen, onClose, onSuccess }: CreateAlbumModalProps) {
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10485760) {
        setErrorStatus('Photo is too large (max 10MB).');
        return;
      }
      
      setIsOptimizing(true);
      setErrorStatus(null);
      
      try {
        const optimized = await compressImage(selectedFile);
        setPreview(optimized);
      } catch (err) {
        console.error('Optimization failed:', err);
        setErrorStatus('Failed to optimize photo.');
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !preview || !auth.currentUser) return;

    setIsUploading(true);
    setErrorStatus(null);

    try {
      const docRef = await addDoc(collection(db, 'albums'), {
        name,
        coverImageUrl: preview,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        visibility: 'public',
        createdAt: serverTimestamp(),
      });

      setName('');
      setPreview(null);
      if (onSuccess) {
        onSuccess(docRef.id);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to create album:', error);
      setErrorStatus('Failed to start album. Please try again.');
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
            className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] bg-natural-bg shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-natural-border px-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-natural-text">Start New Album</h2>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-natural-muted transition-colors hover:bg-natural-border hover:text-natural-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-natural-muted">Album Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Summer in Tuscany"
                    className="w-full rounded-2xl border border-natural-border bg-white px-6 py-4 text-natural-text transition-all focus:border-natural-sage focus:outline-none focus:ring-4 focus:ring-natural-sage/5"
                    required
                  />
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex aspect-[16/9] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed transition-all ${
                    preview ? 'border-natural-sage' : 'border-natural-border hover:border-natural-sage hover:bg-natural-sage/5'
                  }`}
                >
                  {preview ? (
                    <>
                      <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="text-xs font-bold uppercase tracking-widest text-white">Change Cover</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-natural-tan/10 text-natural-tan">
                        {isOptimizing ? <Loader2 className="h-8 w-8 animate-spin" /> : <ImageIcon className="h-8 w-8" />}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold uppercase tracking-widest text-natural-text">Set Cover Photo</p>
                        <p className="text-xs italic text-natural-muted">Choose your album's main image</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {errorStatus && (
                  <p className="text-center text-xs font-bold text-red-500 uppercase tracking-widest">{errorStatus}</p>
                )}

                <button
                  type="submit"
                  disabled={isUploading || isOptimizing || !name || !preview}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-natural-sage py-4 font-bold uppercase tracking-widest text-white transition-all hover:bg-natural-sage-hover hover:shadow-lg disabled:opacity-50 disabled:grayscale"
                >
                  {isUploading || isOptimizing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {isOptimizing ? 'Optimizing Cover...' : 'Creating Album...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Start Album
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
