import React from 'react';
import { CameraIcon, UploadIcon } from './Icons';

interface LogFoodActionsProps {
  onAction: (action: 'camera' | 'upload') => void;
}

const LogFoodActions: React.FC<LogFoodActionsProps> = ({ onAction }) => {
  const isMobile =
    typeof navigator !== 'undefined' &&
    (/Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 640);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const openNativeFileInput = () => {
    try {
      fileInputRef.current?.click();
    } catch {
      // ignore
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        window.dispatchEvent(
          new CustomEvent('nutritrack:file-captured', {
            detail: { name: file.name, dataUrl: reader.result },
          })
        );
      } catch {
        // ignore
      }
    };
    reader.readAsDataURL(file);
    onAction('upload');
    (e.target as HTMLInputElement).value = '';
  };

  const handleCameraClick = async () => {
    if (
      isMobile &&
      document.documentElement &&
      (document.documentElement.requestFullscreen || (document.documentElement as any).webkitRequestFullscreen)
    ) {
      try {
        if ((document.documentElement as any).webkitRequestFullscreen) {
          (document.documentElement as any).webkitRequestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // ignore fullscreen failures
      }
    }

    await new Promise((res) => setTimeout(res, 250));

    try {
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.focus?.();
    } catch {
      // ignore
    }

    if (isMobile) {
      openNativeFileInput();
      return;
    }

    onAction('camera');
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />

      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl">
          <div className="mb-4 text-center">
            <h3 className="text-2xl font-bold text-white">Log a meal</h3>
            <p className="text-sm text-slate-400">Use a photo to quickly analyze and add foods to your log.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={handleCameraClick}
              aria-label="Take a picture"
              className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-600 transform hover:-translate-y-1 transition-all text-white font-semibold rounded-xl p-6 min-h-[140px] shadow-lg"
            >
              <CameraIcon className="w-10 h-10" />
              <span className="text-lg">Take a Picture</span>
              <span className="text-xs text-slate-200/80">
                {isMobile ? 'Opens fullscreen camera' : 'Open the camera to capture a meal'}
              </span>
            </button>

            <button
              onClick={() => {
                if (isMobile) {
                  openNativeFileInput();
                } else {
                  onAction('upload');
                }
              }}
              aria-label="Upload a photo"
              className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 transform hover:-translate-y-1 transition-all text-white font-semibold rounded-xl p-6 min-h-[140px] shadow-lg"
            >
              <UploadIcon className="w-10 h-10" />
              <span className="text-lg">Upload a Photo</span>
              <span className="text-xs text-slate-200/80">Choose an existing image from your device</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogFoodActions;