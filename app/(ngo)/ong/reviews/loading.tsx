export default function ReviewsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Fila de revisão</h1>
        <p className="text-cv-earth/70 text-sm">Carregando comprovantes...</p>
      </div>

      <div className="flex gap-2 mb-4 text-sm">
        {['Todos', 'Pendentes', 'Suspeitos'].map((t) => (
          <span key={t} className="px-3 py-1.5 rounded-full bg-cv-white text-cv-earth/40">
            {t}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-cv-white rounded-2xl p-4 border border-cv-earth/10"
            style={{ animation: 'cv-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.12}s` }}
          >
            <div className="flex gap-4 items-start">
              <div
                className="w-24 h-24 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(245, 240, 232, 1)' }}
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 w-24 rounded-full" style={{ background: 'rgba(245, 240, 232, 1)' }} />
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[0, 1, 2, 3, 4, 5].map((j) => (
                    <div
                      key={j}
                      className="h-3.5 rounded"
                      style={{ background: 'rgba(245, 240, 232, 1)', width: `${60 + ((j * 7) % 30)}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-7 w-20 rounded-full" style={{ background: 'rgba(245, 240, 232, 1)' }} />
                <div className="h-7 w-20 rounded-full" style={{ background: 'rgba(245, 240, 232, 1)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes cv-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
