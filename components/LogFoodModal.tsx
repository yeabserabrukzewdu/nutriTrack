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
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

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

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = { 
        video: { 
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraFacing(facing);
      }
    } catch (err) {
      console.warn(`Could not start ${facing} camera, falling back to default.`, err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (innerErr) {
        console.error("Error accessing camera:", innerErr);
        setError("Unable to access camera. Please ensure camera permissions are granted or try uploading an image.");
        setActiveTab('upload');
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera('environment');
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, startCamera, stopCamera]);

  const handleImageAnalysis = async (base64Image: string, mimeType: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const items = await analyzeMealImage(base64Image, mimeType);
      setAnalysisResult(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze image. Please try again.");
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
      setError(e instanceof Error ? e.message : "Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setAnalysisResult(null);
    setError(null);
    setSearchQuery('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const changeTab = (tab: ModalTab) => {
    resetState();
    setActiveTab(tab);
  };

  const toggleCameraFacing = () => {
    startCamera(cameraFacing === 'environment' ? 'user' : 'environment');
  };

  const renderContent = () => {
    if (isLoading) return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader message="Processing..." />
        <div className="mt-4 text-neon-blue animate-pulse">Analyzing your input...</div>
      </div>
    );

    if (error) return (
      <div className="text-neon-red text-center p-6 bg-red-500/10 rounded-xl border border-red-500/30">
        {error}
        <button
          onClick={resetState}
          className="mt-4 px-4 py-2 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue rounded-lg transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    );

    if (analysisResult) {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-neon-green glow-text">Analysis Results</h3>
          {analysisResult.length > 0 ? (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neon-blue/50 scrollbar-track-slate-900">
              {analysisResult.map((item, index) => (
                <div key={index} className="bg-slate-900/50 p-4 rounded-xl border border-neon-blue/30 hover:border-neon-blue/50 transition-colors">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-sm text-neon-blue">{item.portion} - {item.calories} kcal</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">No food items identified.</p>
          )}
          <div className="flex gap-4 mt-4">
            <button
              onClick={resetState}
              className="flex-1 bg-slate-900/50 hover:bg-slate-900/70 text-white py-3 rounded-lg border border-neon-blue/30 hover:border-neon-blue/50 transition-all duration-300"
            >
              Analyze Another
            </button>
            <button
              onClick={() => onAddFood(analysisResult)}
              disabled={analysisResult.length === 0}
              className="flex-1 bg-neon-green/80 hover:bg-neon-green text-black font-bold py-3 rounded-lg disabled:bg-slate-700 disabled:text-slate-400 transition-all duration-300"
            >
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
            <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-black shadow-inner">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <button
                onClick={toggleCameraFacing}
                className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full hover:bg-slate-900/70 transition-all duration-300"
                aria-label="Switch camera"
              >
                <svg className="w-6 h-6 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={handleCapture}
              className="mt-6 bg-neon-green/80 hover:bg-neon-green text-black rounded-full w-20 h-20 flex items-center justify-center shadow-lg shadow-neon-green/30 transition-transform transform hover:scale-110"
            >
              <CameraIcon className="w-8 h-8" />
            </button>
          </div>
        );
      case 'upload':
        return (
          <div
            className="w-full bg-slate-900/30 border-2 border-dashed border-neon-blue/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:border-neon-blue/70 transition-all duration-300"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="w-16 h-16 text-neon-blue" />
            <h3 className="text-xl font-semibold text-white glow-text">Upload Food Image</h3>
            <p className="text-sm text-slate-400 max-w-xs">Drag & drop or tap to select a high-quality image. Rear camera recommended.</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 bg-neon-blue/80 hover:bg-neon-blue text-black font-bold py-3 px-8 rounded-lg shadow-neon-blue/30 transition-all duration-300"
            >
              Select Image
            </button>
          </div>
        );
      case 'search':
        return (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g., '1 apple' or 'chicken breast'"
                className="w-full bg-slate-900/50 text-white p-4 rounded-lg border border-neon-blue/30 focus:ring-2 focus:ring-neon-blue focus:outline-none transition-all duration-300"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="bg-neon-blue/80 hover:bg-neon-blue text-black p-4 rounded-lg disabled:bg-slate-700 disabled:text-slate-400 transition-all duration-300"
              >
                <SearchIcon className="w-6 h-6" />
              </button>
            </div>
          </form>
        );
    }
  };

  const TabButton = ({ tab, icon, label }: { tab: ModalTab; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => changeTab(tab)}
      className={`flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition-all duration-300
        ${activeTab === tab ? 'text-neon-green border-b-2 border-neon-green glow-text' : 'text-slate-400 hover:text-white'}`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl shadow-2xl shadow-neon-blue/20 w-full max-w-md text-white relative flex flex-col border border-neon-blue/30">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-center text-neon-green glow-text">Log Your Meal</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-neon-blue transition-all duration-300"
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex border-b border-neon-blue/30 px-6">
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