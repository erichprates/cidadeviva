import exifr from 'exifr';

// Resoluções de tela comuns (orientação retrato ou paisagem).
// Fotos tiradas pela câmera raramente batem exatamente com essas dimensões.
const SCREEN_RESOLUTIONS: Array<[number, number]> = [
  // iPhone
  [1170, 2532], [1179, 2556], [1290, 2796], [1284, 2778],
  [1125, 2436], [828, 1792], [750, 1334], [640, 1136],
  // Android comuns
  [1080, 1920], [1080, 2340], [1080, 2400], [1440, 2560],
  [1440, 3120], [1440, 3200], [720, 1280], [1440, 2960],
  // iPads
  [2048, 2732], [1668, 2388], [1640, 2360], [1620, 2160], [1536, 2048],
  // Desktop/laptop
  [1920, 1080], [2560, 1440], [3840, 2160], [1440, 900], [1280, 800],
  [1366, 768], [2560, 1600], [2880, 1800], [1680, 1050], [1600, 900],
];

const DIMENSION_TOLERANCE = 2; // pixels
const ASPECT_TOLERANCE = 0.01;
const SCREEN_ASPECT_RATIOS = [16 / 9, 16 / 10];

function dimensionsMatchScreen(width: number, height: number): boolean {
  const a = Math.min(width, height);
  const b = Math.max(width, height);
  return SCREEN_RESOLUTIONS.some(([w, h]) => {
    const sa = Math.min(w, h);
    const sb = Math.max(w, h);
    return Math.abs(sa - a) <= DIMENSION_TOLERANCE && Math.abs(sb - b) <= DIMENSION_TOLERANCE;
  });
}

function aspectMatchesScreen(width: number, height: number): boolean {
  const ar = Math.max(width, height) / Math.min(width, height);
  return SCREEN_ASPECT_RATIOS.some((r) => Math.abs(ar - r) <= ASPECT_TOLERANCE);
}

export interface ScreenshotVerdict {
  likelyScreenshot: boolean;
  reason: string | null;
  exif: {
    has_camera_make: boolean;
    make: string | null;
    model: string | null;
    taken_at: string | null;
    width: number | null;
    height: number | null;
  };
}

export async function analyzeImageOrigin(buffer: Buffer): Promise<ScreenshotVerdict> {
  let parsed: any = null;
  try {
    parsed = await exifr.parse(buffer, {
      tiff: true,
      ifd0: true,
      exif: true,
      gps: false,
      pick: ['Make', 'Model', 'DateTimeOriginal', 'CreateDate', 'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight'],
    });
  } catch {
    parsed = null;
  }

  const make = parsed?.Make ?? null;
  const model = parsed?.Model ?? null;
  const takenAt = parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? null;
  const width = parsed?.ExifImageWidth ?? parsed?.ImageWidth ?? null;
  const height = parsed?.ExifImageHeight ?? parsed?.ImageHeight ?? null;

  const hasCameraMake = Boolean(make);
  const dimensionsSuspicious = width && height ? dimensionsMatchScreen(width, height) : false;
  const aspectSuspicious = width && height ? aspectMatchesScreen(width, height) : false;

  let likelyScreenshot = false;
  let reason: string | null = null;

  if (!hasCameraMake && dimensionsSuspicious) {
    likelyScreenshot = true;
    reason = 'Imagem sem metadados de câmera e com resolução típica de tela — pode ser screenshot.';
  } else if (!hasCameraMake && aspectSuspicious) {
    likelyScreenshot = true;
    reason = 'Imagem sem metadados de câmera e com proporção de tela (16:9 ou 16:10) — pode ser screenshot.';
  }

  return {
    likelyScreenshot,
    reason,
    exif: {
      has_camera_make: hasCameraMake,
      make,
      model,
      taken_at: takenAt ? new Date(takenAt).toISOString() : null,
      width,
      height,
    },
  };
}
