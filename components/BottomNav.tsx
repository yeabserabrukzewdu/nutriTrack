import React from 'react';

type Section = 'main' | 'insights' | 'calendar' | 'profile';

const Icon = ({ name, className }: { name: string; className?: string }) => {
  switch (name) {
    case 'home':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V11.5z" />
        </svg>
      );
    case 'insights':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M11 3v18M4 12h14" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'profile':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1118.88 6.196 9 9 0 015.12 17.804zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
};

interface BottomNavProps {
  active: Section;
  onChange: (s: Section) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ active, onChange }) => {
  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-slate-800/85 backdrop-blur rounded-2xl px-3 py-2 mx-4 flex gap-2 items-center shadow-lg max-w-4xl w-full">
        <div className="w-full rounded-xl px-2 py-1 flex gap-2 items-center justify-between">
        <button onClick={() => onChange('main')} className={`flex-1 flex flex-col items-center justify-center p-2 ${active === 'main' ? 'text-emerald-400' : 'text-slate-300'}`}>
          <Icon name="home" className="w-6 h-6" />
          <span className="text-xs mt-1">Main</span>
        </button>
        <button onClick={() => onChange('insights')} className={`flex-1 flex flex-col items-center justify-center p-2 ${active === 'insights' ? 'text-emerald-400' : 'text-slate-300'}`}>
          <Icon name="insights" className="w-6 h-6" />
          <span className="text-xs mt-1">Insights</span>
        </button>
        <button onClick={() => onChange('calendar')} className={`flex-1 flex flex-col items-center justify-center p-2 ${active === 'calendar' ? 'text-emerald-400' : 'text-slate-300'}`}>
          <Icon name="calendar" className="w-6 h-6" />
          <span className="text-xs mt-1">Calendar</span>
        </button>
        <button onClick={() => onChange('profile')} className={`flex-1 flex flex-col items-center justify-center p-2 ${active === 'profile' ? 'text-emerald-400' : 'text-slate-300'}`}>
          <Icon name="profile" className="w-6 h-6" />
          <span className="text-xs mt-1">Profile</span>
        </button>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
