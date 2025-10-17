import React, { useEffect, useState, useRef } from 'react';
import AuthPage from './AuthPage';

const ANIM_MS = 300;

const SignupModal: React.FC<{ open: boolean; onClose: () => void; onSignedIn?: () => void }> = ({ open, onClose, onSignedIn }) => {
  const [visible, setVisible] = useState(open);
  const [animIn, setAnimIn] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const titleId = 'signup-modal-title';
  const firstFocusable = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      // mount + play enter animation
      setVisible(true);
      // small delay so transitions trigger reliably
      requestAnimationFrame(() => setAnimIn(true));
      // focus first control after animation starts
      setTimeout(() => firstFocusable.current?.focus(), 120);
    } else if (visible) {
      // play exit animation then unmount
      setAnimIn(false);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        setVisible(false);
      }, ANIM_MS);
    }
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [open, visible]);

  // internal close to ensure exit animation runs before parent closes
  const handleRequestClose = () => {
    setAnimIn(false);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setVisible(false);
      onClose();
    }, ANIM_MS);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        onClick={handleRequestClose}
        className={
          'absolute inset-0 bg-black transition-all ' +
          (animIn ? 'bg-opacity-60 backdrop-blur-sm' : 'bg-opacity-0 backdrop-blur-0')
        }
        aria-hidden
      />

      {/* Modal panel */}
      <div
        className={
          'relative z-10 w-full max-w-lg mx-4 p-0 ' +
          'transition-transform transition-opacity duration-300 ease-out ' +
          (animIn
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95')
        }
      >
        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl">
          <div className="mb-4">
            <h3 id={titleId} className="text-xl font-bold text-emerald-400">
              Sign up to view Calendar
            </h3>
            <p className="text-slate-300 text-sm mt-1">
              Calendar access is limited to signed-in users. Create an account or sign in to sync and view your logs by date.
            </p>
          </div>

          <AuthPage
            compact
            onSignedIn={() => {
              onSignedIn?.();
              // ensure parent receives close after animation
              setAnimIn(false);
              setTimeout(() => onClose(), ANIM_MS);
            }}
          />

          <div className="mt-4 text-right">
            <button
              ref={firstFocusable}
              onClick={handleRequestClose}
              className="text-slate-300 hover:text-white rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;