
import React from 'react';
import { getDaysInMonth, getMonthYear, getDayOfWeek, isSameDay } from '../utils/dateUtils';

interface CalendarViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const CalendarView = ({ selectedDate, onDateChange }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getDayOfWeek(daysInMonth[0]);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
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
  );
};

export default CalendarView;
