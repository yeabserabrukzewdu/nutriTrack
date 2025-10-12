
import React from 'react';

const Loader = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-slate-800/50 rounded-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      <p className="text-emerald-300">{message}</p>
    </div>
  );
};

export default Loader;
