import { ScanUploader } from '@/components/consumer/ScanUploader';

export default function ScanPage() {
  return (
    <div className="pt-2">
      <p className="text-center text-cv-earth/70 mb-6">
        NF, recibo ou cupom fiscal — cada compra vira impacto.
      </p>
      <ScanUploader />
    </div>
  );
}
