'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { SeedIcon } from '../ui/SeedIcon';

interface Props {
  projectTitle: string;
  onDone: () => void;
}

const PHASE_SWITCH_MS = 2800;
const TOTAL_MS = 5500;

export function PlantAnimation({ projectTitle, onDone }: Props) {
  const [animationData, setAnimationData] = useState<unknown | null>(null);
  const [phase, setPhase] = useState<'planting' | 'thanks'>('planting');

  useEffect(() => {
    fetch('/animations/plant.json')
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => setAnimationData(null));
  }, []);

  useEffect(() => {
    const toThanks = setTimeout(() => setPhase('thanks'), PHASE_SWITCH_MS);
    const finish = setTimeout(onDone, TOTAL_MS);
    return () => {
      clearTimeout(toThanks);
      clearTimeout(finish);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-6"
      style={{ background: 'rgba(27, 122, 74, 0.92)' }}
    >
      <div className="text-center text-cv-white">
        <div style={{ width: 280, height: 280 }} className="mx-auto">
          {animationData ? (
            <Lottie animationData={animationData} loop={false} autoplay />
          ) : (
            <div className="w-full h-full grid place-items-center animate-bounce-soft"><SeedIcon size={112} /></div>
          )}
        </div>

        <div className="mt-4 min-h-[8rem] transition-opacity duration-500">
          {phase === 'planting' ? (
            <div key="planting" className="animate-count-up">
              <h2 className="font-display text-5xl">Plantando...</h2>
              <p className="mt-3 text-cv-white/85 max-w-md mx-auto">
                Suas Seeds estão indo para <strong>{projectTitle}</strong>
              </p>
            </div>
          ) : (
            <div key="thanks" className="animate-count-up">
              <h2 className="font-display text-5xl inline-flex items-center gap-2">Obrigado <SeedIcon size={40} /></h2>
              <p className="mt-3 text-cv-white/85 max-w-md mx-auto">
                Uma Seed sua acabou de brotar em <strong>{projectTitle}</strong>. É gente como você que faz a cidade florescer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
