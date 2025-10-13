import React from 'react';
import AuthPage from './AuthPage';

const SignupModal: React.FC<{ open: boolean; onClose: () => void; onSignedIn?: () => void }> = ({ open, onClose, onSignedIn }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-slate-900 rounded-2xl p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-emerald-400">Sign up to view Calendar</h3>
            <p className="text-slate-300 text-sm mt-1">Calendar access is limited to signed-in users. Create an account or sign in to sync and view your logs by date.</p>
          </div>

          <AuthPage compact onSignedIn={() => { onSignedIn?.(); onClose(); }} />

          <div className="mt-4 text-right">
            <button onClick={onClose} className="text-slate-300 hover:text-white">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;
