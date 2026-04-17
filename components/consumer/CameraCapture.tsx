'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Tenta ativar foco automático contínuo quando suportado.
        const track = stream.getVideoTracks()[0];
        try {
          const caps: any = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
          const advanced: any[] = [];
          if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
            advanced.push({ focusMode: 'continuous' });
          }
          if (Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
            advanced.push({ exposureMode: 'continuous' });
          }
          if (Array.isArray(caps.whiteBalanceMode) && caps.whiteBalanceMode.includes('continuous')) {
            advanced.push({ whiteBalanceMode: 'continuous' });
          }
          if (advanced.length) {
            await track.applyConstraints({ advanced } as any).catch(() => {});
          }
        } catch {
          // algumas câmeras não expõem getCapabilities — ignora.
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Permita o acesso à câmera para escanear seu comprovante.'
            : 'Não foi possível abrir a câmera. Tente novamente.',
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const tapToFocus = async (e: React.PointerEvent<HTMLVideoElement>) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    try {
      const caps: any = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
      const advanced: any[] = [];
      if (Array.isArray(caps.focusMode) && caps.focusMode.includes('single-shot')) {
        advanced.push({ focusMode: 'single-shot' });
      }
      if (caps.pointsOfInterest) {
        advanced.push({ pointsOfInterest: [{ x, y }] });
      }
      if (advanced.length) await track.applyConstraints({ advanced } as any);
    } catch {
      // silencioso
    }
  };

  const capture = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const video = videoRef.current;
    if (!video) return;
    setCapturing(true);

    try {
      // ImageCapture API: pede ao sensor uma foto real (full-res, com AF), não o frame de preview.
      const ImageCaptureCtor = (window as any).ImageCapture;
      if (track && ImageCaptureCtor) {
        try {
          const imageCapture = new ImageCaptureCtor(track);
          // Pequeno respiro para autofoco antes do shot.
          await new Promise((r) => setTimeout(r, 250));
          const blob: Blob = await imageCapture.takePhoto();
          setPreview({ url: URL.createObjectURL(blob), blob });
          return;
        } catch {
          // cai no fallback abaixo
        }
      }

      // Fallback (iOS Safari, browsers sem ImageCapture): frame do vídeo + respiro.
      await new Promise((r) => setTimeout(r, 400));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );
      if (!blob) return;
      setPreview({ url: URL.createObjectURL(blob), blob });
    } finally {
      setCapturing(false);
    }
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const confirm = () => {
    if (!preview) return;
    const file = new File([preview.blob], `live-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-cv-earth flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 text-cv-white">
        <button onClick={onCancel} className="text-sm opacity-80 hover:opacity-100">← Cancelar</button>
        <span className="text-sm opacity-80">Escanear comprovante</span>
        <span className="w-12" />
      </div>

      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-cv-white">
            <div>
              <div className="text-5xl">📷</div>
              <p className="mt-4">{error}</p>
              <Button variant="secondary" onClick={onCancel} className="mt-6">Voltar</Button>
            </div>
          </div>
        ) : preview ? (
          <img src={preview.url} alt="Captura" className="w-full h-full object-contain bg-black" />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              onPointerDown={tapToFocus}
              className="w-full h-full object-cover cursor-crosshair"
            />
            <div className="pointer-events-none absolute inset-6 rounded-3xl border-2 border-cv-lime/70" style={{ boxShadow: '0 0 0 9999px rgba(61, 43, 31, 0.35)' }} />
            <div className="absolute top-10 left-0 right-0 text-center text-cv-white text-sm opacity-90">
              Enquadre a nota dentro da moldura
            </div>
            <div className="absolute bottom-28 left-0 right-0 text-center text-cv-white/70 text-xs">
              Toque na tela para focar
            </div>
          </>
        )}
      </div>

      <div className="py-6 bg-cv-earth flex items-center justify-center gap-8">
        {preview ? (
          <>
            <Button variant="secondary" onClick={retake}>Tirar novamente</Button>
            <Button onClick={confirm} variant="gold">Usar esta foto ✓</Button>
          </>
        ) : !error && (
          <button
            onClick={capture}
            disabled={capturing}
            className={`w-20 h-20 rounded-full bg-cv-white ring-4 ring-cv-lime active:scale-95 transition ${capturing ? 'opacity-60' : ''}`}
            aria-label="Capturar"
          >
            {capturing && (
              <span className="w-5 h-5 rounded-full border-2 border-cv-earth/30 border-t-cv-earth animate-spin mx-auto" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
