'use client';

import { useState } from 'react';
import { PlayCircle, ExternalLink } from 'lucide-react';

const TUTORIALES = [
  { titulo: 'Primeros pasos con Snappy', youtubeId: 'WfY9ttbyQ04', descripcion: 'Elegí tu plantilla, personalizá tu menú, creá tu link público, configurá tu método de pago y precio de delivery, y cargá tus primeros productos.' },
  { titulo: 'Cómo configurar transferencia y efectivo', youtubeId: 'XXXXXXXXX', descripcion: 'Activá los métodos de pago y cargá tu alias para recibir transferencias.' },
];

export default function TutorialesPage() {
  const [reproduciendo, setReproduciendo] = useState<Set<number>>(new Set());

  const reproducir = (index: number) => {
    setReproduciendo(prev => new Set(prev).add(index));
  };

  return (
    <div className="bg-paper -m-4 lg:-m-10 p-4 lg:p-10 min-h-[calc(100vh-64px)] lg:min-h-[calc(100vh-0px)]">
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        <header className="text-left">
          <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Tutoriales</h1>
          <p className="text-xs text-graphite mt-1">Videos cortos para sacarle el máximo provecho a Snappy.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {TUTORIALES.map((tutorial, index) => (
            <div key={index} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="relative aspect-video bg-black">
                {reproduciendo.has(index) ? (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${tutorial.youtubeId}?autoplay=1`}
                    title={tutorial.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    onClick={() => reproducir(index)}
                    className="absolute inset-0 w-full h-full group"
                    aria-label={`Reproducir: ${tutorial.titulo}`}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${tutorial.youtubeId}/hqdefault.jpg`}
                      alt={tutorial.titulo}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="bg-white/90 group-hover:bg-white text-ink rounded-full p-3 shadow-lg transition-all group-hover:scale-110">
                        <PlayCircle size={32} fill="currentColor" className="text-ink" />
                      </div>
                    </div>
                  </button>
                )}
              </div>

              <div className="p-5 space-y-2">
                <h3 className="text-sm font-black text-ink uppercase tracking-tight leading-tight">{tutorial.titulo}</h3>
                <p className="text-xs text-graphite leading-relaxed">{tutorial.descripcion}</p>
                <a
                  href={`https://www.youtube.com/watch?v=${tutorial.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fresco hover:text-ink transition-colors pt-1"
                >
                  Ver en YouTube <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
