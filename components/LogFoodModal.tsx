// FIX: Implemented the LogFoodModal component to resolve file content errors.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FoodItem } from '../types';
import { analyzeMealImage, searchFoodDatabase } from '../services/geminiService';
import { CameraIcon, UploadIcon, SearchIcon, XIcon } from './Icons';
import Loader from './Loader';

type ModalTab = 'camera' | 'upload' | 'search';

interface LogFoodModalProps {
  onClose: () => void;
  onAddFood: (foodItems: FoodItem[]) => void;
  initialTab: ModalTab;
}

const LogFoodModal: React.FC<LogFoodModalProps> = ({ onClose, onAddFood, initialTab }) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FoodItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera using the preferred facing mode (environment by default).
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = { video: { facingMode: { ideal: facing } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn(`Could not start ${facing} camera, falling back to default.`, err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (innerErr) {
        console.error("Error accessing camera:", innerErr);
        setError("Could not access camera. Please check permissions.");
        setActiveTab('upload');
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    if (activeTab === 'camera') {
      // Prefer the back-facing camera by default
      startCamera('environment');
    } else {
      stopCamera();
    }

    // Cleanup camera on unmount
    return () => {
      stopCamera();
    };
  }, [activeTab, startCamera, stopCamera]);

  const handleImageAnalysis = async (base64Image: string, mimeType: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const items = await analyzeMealImage(base64Image, mimeType);
      setAnalysisResult(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      const base64Image = dataUrl.split(',')[1];
      handleImageAnalysis(base64Image, 'image/jpeg');
      stopCamera();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        handleImageAnalysis(base64String, file.type);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setIsLoading(true);
      setError(null);
      setAnalysisResult(null);
      try {
          const item = await searchFoodDatabase(searchQuery);
          setAnalysisResult(item ? [item] : []);
      } catch (e) {
          setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
          setIsLoading(false);
      }
  };

  const resetState = () => {
    setAnalysisResult(null);
    setError(null);
    setSearchQuery('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const changeTab = (tab: ModalTab) => {
    resetState();
    setActiveTab(tab);
  };

  const renderContent = () => {
    if (isLoading) return <Loader message="Analyzing..." />;
    if (error) return <div className="text-red-400 text-center p-4">{error}</div>;

    if (analysisResult) {
      return (
        <div>
          <h3 className="text-lg font-bold mb-3 text-emerald-400">Analysis Result</h3>
          {analysisResult.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {analysisResult.map((item, index) => (
                <div key={index} className="bg-slate-700 p-3 rounded-lg">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-slate-400">{item.portion} - {item.calories} kcal</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">No food items were identified.</p>
          )}
          <div className="flex gap-4 mt-4">
            <button onClick={resetState} className="w-full bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">
              Analyze Another
            </button>
            <button onClick={() => onAddFood(analysisResult)} disabled={analysisResult.length === 0} className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-slate-600 transition-colors">
              Add to Log
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'camera':
        return (
          <div className="flex flex-col items-center w-full">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl bg-black mb-4 h-80 object-cover shadow-inner" />
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="mt-4">
                  <button onClick={handleCapture} className="relative bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg transition-transform transform hover:scale-105">
                    <CameraIcon className="w-8 h-8" />
                  </button>
                </div>
              </div>
        );
      case 'upload':
        return (
          <div className="w-full flex items-center justify-center">
            <div
              className="w-full max-w-2xl bg-slate-800 border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="w-20 h-20 text-slate-400" />
              <h3 className="text-xl font-semibold text-white">Upload or take a photo</h3>
              <p className="text-sm text-slate-400">Drag & drop an image here, or click to select a file. We recommend using the rear camera.</p>
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
              <button onClick={() => fileInputRef.current?.click()} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                Select Photo
              </button>
            </div>
          </div>
        );
      case 'search':
        return (
          <form onSubmit={handleSearch}>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g., '1 apple' or 'chicken breast'"
                className="w-full bg-slate-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button type="submit" className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 transition-colors flex-shrink-0">
                <SearchIcon className="w-6 h-6" />
              </button>
            </div>
          </form>
        );
    }
  };

  const TabButton = ({ tab, icon, label }: { tab: ModalTab, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => changeTab(tab)}
      className={`flex-1 flex items-center justify-center gap-2 py-3 font-semibold transition-colors
        ${activeTab === tab ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`
      }
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md text-white relative flex flex-col">
        <div className='p-6'>
            <h2 className="text-2xl font-bold text-center mb-4">Log Food</h2>
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
            </button>
        </div>
        
        <div className="flex border-b border-slate-700 px-6">
          <TabButton tab="camera" icon={<CameraIcon className="w-5 h-5" />} label="Camera" />
          <TabButton tab="upload" icon={<UploadIcon className="w-5 h-5" />} label="Upload" />
          <TabButton tab="search" icon={<SearchIcon className="w-5 h-5" />} label="Search" />
        </div>
        
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LogFoodModal;
