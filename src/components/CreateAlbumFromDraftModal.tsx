import { useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { compressImage } from '../utils';
import { X, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreateAlbumFromDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (albumId: string) => void;
}

export default function CreateAlbumFromDraftModal({ isOpen, onClose, onSuccess }: CreateAlbumFromDraftModalProps) {
  const [name, setName] = useState('');
  const [draftText, setDraftText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
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
    if (!name || !draftText || !auth.currentUser) return;
    // Note: preview is optional for draft albums, or we can make it required. Let's make it optional.

    setIsProcessing(true);
    setErrorStatus(null);

    try {
      setProcessingStatus('Parsing your draft with AI...');
      // 1. Parse draft using backend
      const res = await fetch('/api/parse-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draftText })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to parse draft');
      }
      
      const parsedDays = await res.json();
      if (!Array.isArray(parsedDays) || parsedDays.length === 0) {
        throw new Error('No valid days found in the draft.');
      }

      setProcessingStatus('Creating your album...');
      
      // 2. Create Album Doc
      const albumRef = await addDoc(collection(db, 'albums'), {
        name,
        coverImageUrl: preview || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80',
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        visibility: 'public',
        createdAt: serverTimestamp(),
      });

      setProcessingStatus('Generating placeholder memories...');
      
      // 3. Create Moment docs in a batch
      const batch = writeBatch(db);
      for (const day of parsedDays) {
        const momentRef = doc(collection(db, 'moments'));
        batch.set(momentRef, {
          albumId: albumRef.id,
          date: day.date || 'Unknown Date',
          images: [],
          note: `**${day.location || 'Location'}**\n\n${day.note || ''}`,
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'Anonymous',
          visibility: 'public',
          createdAt: serverTimestamp(),
        });
      }
      
      await batch.commit();

      setName('');
      setDraftText('');
      setPreview(null);
      if (onSuccess) {
        onSuccess(albumRef.id);
      } else {
        onClose();
      }
    } catch (error: unknown) {
      console.error('Failed to create album from draft:', error);
      const errMessage = error instanceof Error ? error.message : 'Failed to start album from draft. Please try again.';
      setErrorStatus(errMessage);
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
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
            className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-natural-bg shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-natural-border px-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-natural-text">Magic Draft Import</h2>
              <button 
                onClick={onClose}
                disabled={isProcessing}
                className="rounded-full p-2 text-natural-muted transition-colors hover:bg-natural-border hover:text-natural-text disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-natural-muted">Album Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Ultimate 14-Day Japan Tour"
                    className="w-full rounded-2xl border border-natural-border bg-white px-6 py-4 text-natural-text transition-all focus:border-natural-sage focus:outline-none focus:ring-4 focus:ring-natural-sage/5"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-natural-muted">Paste Draft</label>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Paste your card making drafted notes here. Our AI will automatically convert them into structured placeholders for your album."
                    className="h-40 w-full resize-none rounded-2xl border border-natural-border bg-white px-6 py-4 text-sm text-natural-text transition-all focus:border-natural-sage focus:outline-none focus:ring-4 focus:ring-natural-sage/5"
                    required
                  />
                </div>

                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className={`group relative flex h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed transition-all ${
                    preview ? 'border-natural-sage' : 'border-natural-border hover:border-natural-sage hover:bg-natural-sage/5'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {preview ? (
                    <>
                      <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="text-xs font-bold uppercase tracking-widest text-white">Change Cover (Optional)</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-natural-tan/10 text-natural-tan">
                        {isOptimizing ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold uppercase tracking-widest text-natural-text">Set Cover Photo (Optional)</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    disabled={isProcessing}
                  />
                </div>

                {errorStatus && (
                  <p className="text-center text-xs font-bold text-red-500 uppercase tracking-widest">{errorStatus}</p>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || isOptimizing || !name || !draftText}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-natural-sage py-4 font-bold uppercase tracking-widest text-white transition-all hover:bg-natural-sage-hover hover:shadow-lg disabled:opacity-50 disabled:grayscale"
                >
                  {isProcessing || isOptimizing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {processingStatus || 'Working...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Magic Draft
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
