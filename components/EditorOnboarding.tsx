import React, { useState, useEffect, useRef } from 'react';
import { Pencil, X, ArrowRight } from 'lucide-react';

/**
 * ONBOARDING del editor: en la primera visita destaca el botón del lápiz
 * (modo selección de elementos) con un spotlight y explicación paso a paso.
 * Se muestra UNA sola vez (localStorage) y al cerrarse activa el modo.
 */

const STORAGE_KEY = 'im_editor_onboarded';

export const EditorOnboarding: React.FC<{
  onActivate: () => void;
  targetRef?: React.RefObject<HTMLElement>;
}> = ({ onActivate, targetRef }) => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0); // 0 = spotlight lápiz, 1 = listo
  const btnRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, side: 'right' as 'right' | 'left' });

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch { return; }
    // pequeño delay para que el editor termine de montar
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Recalcular la posición del botón del lápiz cuando se muestra
  useEffect(() => {
    if (!visible) return;
    const calc = () => {
      const el = targetRef?.current || document.querySelector('[aria-label*="modo selección"]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ x: r.left, y: r.top, side: r.left > window.innerWidth / 2 ? 'right' : 'left' });
    };
    calc();
    const ro = new ResizeObserver(calc);
    window.addEventListener('resize', calc);
    return () => { ro.disconnect(); window.removeEventListener('resize', calc); };
  }, [visible, targetRef]);

  const cerrar = (activar: boolean) => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
    setVisible(false);
    if (activar) onActivate();
  };

  if (!visible) return null;

  const steps = [
    {
      titulo: 'Edita cualquier texto de tu invitación',
      texto: 'Haz clic en este botón del lápiz y después haz clic en cualquier texto de la invitación para cambiarlo directamente.',
      icono: <Pencil className="w-8 h-8 text-pink-500" />
    }
  ];
  const s = steps[step] || steps[0];

  return (
    <>
      {/* Overlay oscuro con spotlight sobre el botón */}
      <div
        className="fixed inset-0 z-[60] transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle 90px at ${pos.x + 20}px ${pos.y + 20}px, transparent 0%, rgba(0,0,0,.55) 100%)`,
          pointerEvents: 'auto'
        }}
        onClick={() => cerrar(false)}
      />

      {/* Anillo pulsante sobre el botón */}
      <div
        className="fixed z-[61] pointer-events-none"
        style={{ left: pos.x - 6, top: pos.y - 6, width: 52, height: 52 }}
      >
        <div className="w-full h-full rounded-xl border-[3px] border-pink-400 animate-pulse" />
        <div className="absolute inset-0 rounded-xl border-2 border-pink-300 opacity-60 animate-ping" />
      </div>

      {/* Tarjeta de explicación */}
      <div
        className="fixed z-[62] w-[290px]"
        style={{
          ...(pos.side === 'right'
            ? { right: Math.max(12, window.innerWidth - pos.x + 16) }
            : { left: pos.x + 60 }),
          top: Math.min(pos.y + 40, window.innerHeight - 220)
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl flex items-center justify-center shrink-0">
              {s.icono}
            </div>
            <button onClick={() => cerrar(false)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">{s.titulo}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{s.texto}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => cerrar(true)}
              className="flex-1 px-3 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/25 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" /> Activar edición
            </button>
            <button
              onClick={() => cerrar(false)}
              className="px-3 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              Después
            </button>
          </div>
          {/* flecha */}
          <div
            className="absolute w-3 h-3 bg-white border-l-2 border-t-2 border-pink-200 transform rotate-45"
            style={
              pos.side === 'right'
                ? { right: -8, top: 24 }
                : { left: -8, top: 24 }
            }
          />
        </div>
      </div>
    </>
  );
};
