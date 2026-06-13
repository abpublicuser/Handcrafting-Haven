import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ImageModalProps {
  imageUrl: string;
  comment?: string;
  onClose: () => void;
}

export default function ImageModal({ imageUrl, comment, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8 backdrop-blur-sm"
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white sm:right-8 sm:top-8"
      >
        <X className="h-6 w-6 sm:h-8 sm:w-8" />
      </button>

      <div className="flex flex-col items-center justify-center h-full max-h-[90vh] w-full max-w-5xl gap-4" onClick={(e) => e.stopPropagation()}>
        <motion.img
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          src={imageUrl}
          alt={comment || "Full resolution memory"}
          className="min-h-0 min-w-0 flex-shrink rounded-lg object-contain shadow-2xl"
          style={{ maxHeight: comment ? 'calc(100% - 3rem)' : '100%' }}
        />
        {comment && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 text-center text-sm md:text-base text-white/90 max-w-2xl px-4"
          >
            {comment}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
