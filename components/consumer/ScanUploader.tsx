'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Lottie from 'lottie-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CameraCapture } from './CameraCapture';
import { MIN_SEEDS_TO_PLANT, reaisFromSeeds } from '@/lib/credits/calculator';
import { createClient } from '@/lib/supabase/client';
import { playDingSound } from '@/lib/sounds';
import { dispatchCollectibleAwards, type CollectibleAward } from './CollectibleToast';
import { dispatchAchievementUnlocks, type AchievementUnlock } from './AchievementToast';
import { formatBRL, formatSeeds } from '@/lib/format';
import { SeedIcon } from '../ui/SeedIcon';

type Status = 'idle' | 'uploading' | 'success' | 'suspicious' | 'duplicate' | 'rejected' | 'pix' | 'error';

interface ResultPayload {
  status?: string;
  credits_generated?: number;
  seeds_generated?: number;
  message?: string;
  merchant_found?: { name: string } | null;
  error?: string;
  code?: string;
  rejection_reason?: string;
  collectibles?: CollectibleAward[];
  achievements?: AchievementUnlock[];
}

const MAX_DIMENSION = 900;
const JPEG_QUALITY = 0.75;

async function loadImageSource(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (bitmap) return bitmap;

  // Fallback para formatos que o browser só decodifica via <img> (ex: HEIC no Safari)
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

async function compressImage(file: File): Promise<File | null> {
  if (!file.type.startsWith('image/')) return null;

  const source = await loadImageSource(file);
  if (!source) return null;

  const srcW = 'width' in source ? source.width : (source as HTMLImageElement).naturalWidth;
  const srcH = 'height' in source ? source.height : (source as HTMLImageElement).naturalHeight;
  if (!srcW || !srcH) return null;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
  const width = Math.round(srcW * scale);
  const height = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) return null;

  const originalKb = Math.round(file.size / 1024);
  const newKb = Math.round(blob.size / 1024);
  console.log(`[scan] imagem comprimida: ${originalKb}kb → ${newKb}kb`);

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export function ScanUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [seedsBalance, setSeedsBalance] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanAnim, setScanAnim] = useState<unknown | null>(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (status !== 'uploading' || scanAnim) return;
    fetch('/animations/scan.json')
      .then((r) => r.json())
      .then(setScanAnim)
      .catch(() => setScanAnim(null));
  }, [status, scanAnim]);

  useEffect(() => {
    if (status !== 'success') return;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('credit_wallets')
        .select('total_seeds_earned, seeds_allocated')
        .eq('consumer_id', user.id)
        .maybeSingle();
      const earned = Number(data?.total_seeds_earned ?? 0);
      const allocated = Number(data?.seeds_allocated ?? 0);
      setSeedsBalance(earned - allocated);
    })();
  }, [status]);

  const handleFile = useCallback(async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setStatus('uploading');
    setResult(null);

    const compressed = await compressImage(file);
    if (!compressed) {
      setStatus('error');
      setResult({ error: 'Formato de imagem não suportado. Envie uma foto JPG ou PNG.' });
      return;
    }

    const isLiveCapture = file.name.startsWith('live-scan-');

    const formData = new FormData();
    formData.append('image', compressed);
    if (isLiveCapture) formData.append('live_capture', '1');

    try {
      const res = await fetch('/api/scan', { method: 'POST', body: formData });
      const data: ResultPayload = await res.json();

      if (data.rejection_reason === 'pix_not_accepted') setStatus('pix');
      else if (res.status === 409) setStatus('duplicate');
      else if (!res.ok) setStatus('error');
      else if (data.status === 'approved') {
        playDingSound();
        setStatus('success');
        setTimeout(() => dispatchCollectibleAwards(data.collectibles), 600);
        // Conquistas desbloqueadas são mais raras e "pesam mais" — aparecem depois
        setTimeout(() => dispatchAchievementUnlocks(data.achievements), 1600);
      }
      else if (data.status === 'suspicious') setStatus('suspicious');
      else if (data.status === 'rejected') setStatus('rejected');
      else setStatus('suspicious');
      setResult(data);
    } catch (err) {
      setStatus('error');
      setResult({ error: err instanceof Error ? err.message : 'Erro inesperado' });
    }
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setPreview(null);
    setStatus('idle');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const seedsGained = result?.seeds_generated ?? 0;
  const reaisEquiv = result?.credits_generated ?? 0;
  const canPlant = seedsBalance >= MIN_SEEDS_TO_PLANT;
  const seedsToReachMin = Math.max(0, MIN_SEEDS_TO_PLANT - seedsBalance);
  const minProgress = Math.min(100, Math.round((seedsBalance / MIN_SEEDS_TO_PLANT) * 100));

  return (
    <div className="w-full max-w-xl mx-auto">
      {status === 'idle' && isMobile && (
        <div className="bg-cv-white rounded-3xl p-8 text-center border border-cv-earth/10">
          <div className="mx-auto w-24 h-24 rounded-full bg-cv-green/10 grid place-items-center animate-pulse-slow">
            <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-cv-green" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h2l1.5-2h7L17 7h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="mt-6 font-display text-2xl text-cv-earth">Escaneie seu comprovante</h2>
          <p className="mt-2 text-cv-earth/70 text-sm">
            Aponte a câmera para a nota. A foto precisa ser ao vivo.
          </p>
          <p className="mt-2 text-xs text-cv-earth/60">
            NF, recibo ou cupom fiscal — PIX não é aceito.
          </p>
          <Button onClick={() => setCameraOpen(true)} className="mt-6 w-full">
            Escanear nota 📷
          </Button>
        </div>
      )}

      {status === 'idle' && !isMobile && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
            dragOver ? 'border-cv-green bg-cv-green/5' : 'border-cv-earth/20 bg-cv-white'
          }`}
        >
          <div className="mx-auto w-24 h-24 rounded-full bg-cv-green/10 grid place-items-center animate-pulse-slow">
            <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-cv-green" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h2l1.5-2h7L17 7h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="mt-6 font-display text-2xl text-cv-earth">Escaneie seu comprovante</h2>
          <p className="mt-2 text-cv-earth/70">
            Arraste a foto aqui ou clique para escolher um arquivo.
          </p>
          <p className="mt-3 text-xs text-cv-earth/60">
            NF, recibo ou cupom fiscal — PIX não é aceito.
          </p>
          <p className="mt-2 text-xs text-cv-earth/50">
            Para melhor experiência, use o celular.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            className="hidden"
          />
        </div>
      )}

      {cameraOpen && (
        <CameraCapture
          onCancel={() => setCameraOpen(false)}
          onCapture={(file) => { setCameraOpen(false); handleFile(file); }}
        />
      )}

      {status === 'uploading' && preview && (
        <Card className="text-center">
          <div className="flex justify-center">
            <div className="relative inline-block">
              <img src={preview} alt="Comprovante" className="block max-h-64 rounded-xl object-contain" />
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div style={{ width: 180, height: 180, transform: 'translateX(-9%)' }}>
                  {scanAnim ? (
                    <Lottie animationData={scanAnim} loop autoplay />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-5xl animate-pulse">🔍</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-cv-earth/80">Analisando seu comprovante...</div>
        </Card>
      )}

      {status === 'success' && result && (
        <Card className="text-center animate-bounce-soft border-cv-green/20">
          <div className="text-4xl">🎉</div>
          <div className="mt-2 text-cv-earth/70">Comprovante aprovado!</div>

          <div className="mt-4 font-display text-6xl text-cv-green animate-count-up inline-flex items-center justify-center gap-2">
            +{formatSeeds(seedsGained)} <SeedIcon size={44} />
          </div>
          <div className="mt-1 text-sm text-cv-earth/70">Seeds</div>
          <div className="mt-1 text-xs text-cv-earth/50">equivale a {formatBRL(reaisEquiv)}</div>

          {result.merchant_found && (
            <div className="mt-4 text-cv-earth">em <strong>{result.merchant_found.name}</strong></div>
          )}

          {!canPlant ? (
            <div className="mt-6 bg-cv-sand rounded-2xl p-4">
              <div className="text-sm text-cv-earth/80">
                <strong>{seedsBalance}</strong> / {MIN_SEEDS_TO_PLANT} Seeds para poder plant seu primeiro projeto
              </div>
              <div className="mt-3 h-2 rounded-full bg-cv-white overflow-hidden">
                <div className="h-full bg-cv-lime transition-all" style={{ width: `${minProgress}%` }} />
              </div>
              <div className="mt-2 text-xs text-cv-earth/60 inline-flex items-center justify-center gap-1">
                Faltam {seedsToReachMin} Seeds <SeedIcon size={12} />
              </div>
            </div>
          ) : (
            <Link
              href="/projects"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-6 py-3 text-sm font-medium hover:bg-cv-green/90"
            >
              Plant agora →
            </Link>
          )}

          <div className="mt-4">
            <Button variant="secondary" onClick={reset}>Escanear outro</Button>
          </div>
        </Card>
      )}

      {status === 'suspicious' && (
        <Card className="text-center bg-amber-50 border-amber-200">
          <div className="text-3xl">🕵️</div>
          <h3 className="mt-2 font-display text-xl">Enviado para revisão</h3>
          <p className="mt-2 text-cv-earth/70">
            {result?.message ?? 'Precisamos verificar este comprovante com calma. Você recebe uma notificação em breve.'}
          </p>
          <Button className="mt-4" variant="secondary" onClick={reset}>Escanear outro</Button>
        </Card>
      )}

      {status === 'duplicate' && (
        <Card className="text-center">
          <div className="text-3xl">📎</div>
          <h3 className="mt-2 font-display text-xl">Este comprovante já foi registrado</h3>
          <p className="mt-2 text-cv-earth/70">Cada compra conta apenas uma vez — é assim que mantemos a comunidade justa.</p>
          <Button className="mt-4" variant="secondary" onClick={reset}>Escanear outro</Button>
        </Card>
      )}

      {status === 'pix' && (
        <Card className="text-center bg-amber-50 border-amber-200">
          <div className="text-4xl">💳</div>
          <h3 className="mt-2 font-display text-xl">PIX não é aceito</h3>
          <p className="mt-2 text-cv-earth/70">
            O comprovante de PIX é gerado pelo seu banco, não pelo lojista. Peça sempre a nota fiscal ou recibo no estabelecimento.
          </p>
          <Button className="mt-4" variant="secondary" onClick={reset}>Escanear outro</Button>
        </Card>
      )}

      {status === 'rejected' && (
        <Card className="text-center border-red-200 bg-red-50">
          <div className="text-3xl">⚠️</div>
          <h3 className="mt-2 font-display text-xl">Não conseguimos validar</h3>
          <p className="mt-2 text-cv-earth/70">{result?.message ?? 'Tente uma foto mais nítida e bem iluminada.'}</p>
          <Button className="mt-4" variant="secondary" onClick={reset}>Tentar novamente</Button>
        </Card>
      )}

      {status === 'error' && (
        <Card className="text-center border-red-200 bg-red-50">
          <h3 className="font-display text-xl">Algo deu errado</h3>
          <p className="mt-2 text-cv-earth/70">{result?.error ?? 'Tente novamente em instantes.'}</p>
          <Button className="mt-4" variant="secondary" onClick={reset}>Tentar novamente</Button>
        </Card>
      )}
    </div>
  );
}
