// ...existing code...
import React from 'react';
import { getDaysInMonth, getMonthYear, getDayOfWeek, isSameDay } from '../utils/dateUtils';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

interface CalendarViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const CalendarView = ({ selectedDate, onDateChange }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAnonymous(!!(user && user.isAnonymous));
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getDayOfWeek(daysInMonth[0]);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // While auth state is being determined, avoid flashing UI
  if (!authChecked) {
    return (
      <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
        <div className="text-slate-400">Loading calendar…</div>
      </div>
    );
  }

  return (
    <div className="relative bg-slate-800 p-6 rounded-2xl shadow-lg">
      {/* Block anonymous users with a modal overlay */}
      {isAnonymous && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-[min(560px,96%)] bg-slate-800 text-white rounded-2xl shadow-xl p-6 mx-4">
            <h3 className="text-2xl font-semibold text-emerald-300">Sign up required</h3>
            <p className="mt-3 text-slate-300">
              Calendar access is reserved for registered users. Create an account or sign in to keep your logs synced across devices.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={async () => {
                  try {
                    // Signing out the anonymous user will reveal the Auth flow in the parent app
                    await signOut(auth);
                  } catch (e) {
                    console.error('Failed to sign out anonymous user', e);
                  }
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg"
              >
                Sign up / Sign in
              </button>
              <button
                onClick={() => {
                  // Try to navigate back; if that's not applicable in your SPA this simply closes the modal visually
                  if (window.history.length > 1) window.history.back();
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg"
              >
                Back
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-400">
              You can continue using other parts of the app — calendar features require an account.
            </div>
          </div>
        </div>
      )}

      {/* Calendar UI (kept visible under the modal for context) */}
      <div className={`${isAnonymous ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="text-slate-400 hover:text-white">&lt;</button>
          <h2 className="text-lg font-bold text-emerald-400">{getMonthYear(currentMonth)}</h2>
          <button onClick={handleNextMonth} className="text-slate-400 hover:text-white">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm text-slate-400">
          {weekdays.map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 mt-2">
          {Array.from({ length: firstDayOfMonth }).map((_, index) => <div key={`empty-${index}`}></div>)}
          {daysInMonth.map(day => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={day.toString()}
                onClick={() => onDateChange(day)}
                disabled={isAnonymous}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                  ${isSelected ? 'bg-emerald-500 text-white font-bold' : ''}
                  ${!isSelected && isToday ? 'border border-emerald-500 text-emerald-400' : ''}
                  ${!isSelected && !isToday ? 'hover:bg-slate-700 text-slate-300' : ''}
                `}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
// ...existing code...