import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';

interface ImagePickerProps {
  currentImage?: string;
  onImageChange: (base64: string | null) => void;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ currentImage, onImageChange }) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Comprimir imagen a un tamaño razonable
  const compressImage = (dataUrl: string, maxWidth = 400, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  };

  // Seleccionar archivo desde dispositivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const compressed = await compressImage(dataUrl);
      setPreview(compressed);
      onImageChange(compressed);
    };
    reader.readAsDataURL(file);
  };

  // Iniciar cámara
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setShowCamera(true);
    } catch (err) {
      setCameraError('No se pudo acceder a la cámara. Verificá los permisos.');
      console.error('Camera error:', err);
    }
  }, []);

  // Capturar foto
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const compressed = await compressImage(dataUrl);
    
    setPreview(compressed);
    onImageChange(compressed);
    stopCamera();
  }, [onImageChange]);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  // Limpiar imagen
  const clearImage = () => {
    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm text-gray-400 mb-1">Imagen del producto</label>
      
      {/* Preview */}
      {preview && !showCamera && (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-700 bg-black">
          <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full transition"
            title="Quitar imagen"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Camera View */}
      {showCamera && (
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-700 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-48 object-cover"
          />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              className="bg-brand-gold text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-yellow-400 transition shadow-lg"
            >
              📸 Capturar
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="bg-gray-700 text-white px-4 py-2 rounded-full text-sm hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botones de acción */}
      {!showCamera && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-gray-300 py-2 rounded-xl text-sm hover:bg-gray-700 transition border border-gray-700"
          >
            <Upload size={16} />
            Subir imagen
          </button>
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-gray-300 py-2 rounded-xl text-sm hover:bg-gray-700 transition border border-gray-700"
          >
            <Camera size={16} />
            Cámara
          </button>
        </div>
      )}

      {/* Error de cámara */}
      {cameraError && (
        <p className="text-red-400 text-xs mt-1">{cameraError}</p>
      )}
    </div>
  );
};

export default ImagePicker;
