import React from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useVoice } from '@/lib/hooks/useVoice';

/* Voice playback pill — text-to-speech for the voice-first SHG workflows.
   Tactile soft button with a subtle playing pulse. */

export const VoicePlayer: React.FC<{ text: string; label?: string }> = ({
  text,
  label = 'Listen',
}) => {
  const { speak, stop, isPlaying, isSupported } = useVoice();
  const reduce = useReducedMotion();

  if (!isSupported) return null;

  const cls =
    'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors ' +
    (isPlaying
      ? 'bg-accent/10 text-accent'
      : 'border border-stone-200/80 bg-surface text-muted hover:text-ink hover:bg-inset shadow-tactile-sm');

  const inner = (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {isPlaying ? (
          <motion.span
            key="on"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
          >
            <VolumeX size={16} />
          </motion.span>
        ) : (
          <motion.span
            key="off"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
          >
            <Volume2 size={16} />
          </motion.span>
        )}
      </AnimatePresence>
      {isPlaying ? 'Stop' : label}
    </>
  );

  if (reduce) {
    return (
      <button className={cls} onClick={isPlaying ? stop : () => speak(text)}>
        {inner}
      </button>
    );
  }

  return (
    <motion.button
      className={cls}
      whileTap={{ scale: 0.96 }}
      animate={isPlaying ? { boxShadow: '0 0 0 0 rgba(13,148,136,0.35)' } : {}}
      onClick={isPlaying ? stop : () => speak(text)}
    >
      {inner}
    </motion.button>
  );
};
