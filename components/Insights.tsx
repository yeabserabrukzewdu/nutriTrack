
import React, { useState, useEffect, useCallback } from 'react';
// FIX: Corrected import path for types.
import { FoodItem, MacroGoals } from '../types';
import { getPersonalizedInsights } from '../services/geminiService';
import Loader from './Loader';

interface InsightsProps {
  loggedFoods: FoodItem[];
  goals: MacroGoals;
}

const Insights = ({ loggedFoods, goals }: InsightsProps) => {
  const [insights, setInsights] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (loggedFoods.length === 0) {
      setInsights("Log some food to get your personalized insights for the day!");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPersonalizedInsights(loggedFoods, goals);
      setInsights(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch insights.");
    } finally {
      setIsLoading(false);
    }
  }, [loggedFoods, goals]);

  // Fetch insights when component mounts or food log changes
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return (
    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-emerald-400">AI Insights</h2>
      {isLoading ? (
        <Loader message="Generating your insights..." />
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="prose prose-invert prose-sm text-slate-300 max-w-none" dangerouslySetInnerHTML={{ __html: insights.replace(/\n/g, '<br />') }} />
      )}
      <button 
        onClick={fetchInsights} 
        disabled={isLoading}
        className="mt-4 w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-slate-600 transition-colors"
      >
        {isLoading ? 'Refreshing...' : 'Get Fresh Insights'}
      </button>
    </div>
  );
};

export default Insights;