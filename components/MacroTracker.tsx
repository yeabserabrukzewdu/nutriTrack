
import React from 'react';
// FIX: Corrected import path for types.
import { FoodItem, MacroGoals } from '../types';

interface MacroTrackerProps {
  loggedFoods: FoodItem[];
  goals: MacroGoals;
}

const ProgressBar = ({ value, max, label, color }: { value: number; max: number; label: string; color: string }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm text-slate-400">{Math.round(value)} / {max}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

const MacroTracker = ({ loggedFoods, goals }: MacroTrackerProps) => {
  const totals = loggedFoods.reduce((acc, item) => {
    acc.calories += item.calories;
    acc.protein += item.protein;
    acc.carbs += item.carbs;
    acc.fat += item.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-emerald-400">Today's Macros</h2>
      <div className="space-y-4">
        <ProgressBar value={totals.calories} max={goals.calories} label="Calories" color="bg-sky-500" />
        <ProgressBar value={totals.protein} max={goals.protein} label="Protein (g)" color="bg-rose-500" />
        <ProgressBar value={totals.carbs} max={goals.carbs} label="Carbs (g)" color="bg-amber-500" />
        <ProgressBar value={totals.fat} max={goals.fat} label="Fat (g)" color="bg-violet-500" />
      </div>
    </div>
  );
};

export default MacroTracker;