import React, { useRef } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Controles del editor para personas sin conocimientos técnicos: solo palabras,
 * sin medidas ni códigos. Un toque elige; la opción activa queda resaltada.
 */

interface SelectorPalabrasProps {
  etiqueta: string;
  /** Frase corta que explica qué hace, para quien no lo conozca. */
  ayuda?: string;
  opciones: string[];
  /** Índice de la opción activa, o null si ninguna. */
  activo: number | null;
  /** Opciones que en este elemento no cambiarían nada. */
  desactivadas?: number[];
  alElegir: (indice: number) => void;
}

export const SelectorPalabras: React.FC<SelectorPalabrasProps> = ({
  etiqueta, ayuda, opciones, activo, desactivadas = [], alElegir,
}) => (
  <div className="space-y-1.5">
    <span className="block text-[11px] font-medium text-gray-600">{etiqueta}</span>
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={etiqueta}
    >
      {opciones.map((texto, i) => {
        const activa = activo === i;
        const sinEfecto = desactivadas.includes(i);
        return (
          <button
            key={texto}
            type="button"
            disabled={sinEfecto}
            aria-pressed={activa}
            title={sinEfecto ? 'Esta opción no cambiaría nada en este elemento' : texto}
            onClick={() => alElegir(i)}
            className={`min-h-[36px] px-1 py-1.5 rounded-lg border text-[11px] leading-tight text-center transition-colors ${
              activa
                ? 'bg-pink-500 border-pink-500 text-white font-semibold'
                : sinEfecto
                  ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600'
            }`}
          >
            {texto}
          </button>
        );
      })}
    </div>
    {ayuda && <p className="text-[10px] text-gray-400 leading-snug">{ayuda}</p>}
  </div>
);

const esHex = (v?: string): v is string => /^#[0-9a-fA-F]{6}$/.test(v || '');

interface ControlColorProps {
  etiqueta: string;
  /** Color escrito en el elemento ahora. */
  valor: string;
  /** El usuario lo cambió respecto al diseño. */
  cambiado: boolean;
  alCambiar: (valor: string) => void;
  alRestaurar: () => void;
  /** Botón extra, p. ej. "Sin fondo". */
  extra?: React.ReactNode;
}

/** Color con un-selector visual y vuelta al color del diseño. Sin códigos. */
export const ControlColor: React.FC<ControlColorProps> = ({ etiqueta, valor, cambiado, alCambiar, alRestaurar, extra }) => {
  const entrada = useRef<HTMLInputElement>(null);
  const estado = /^(transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/i.test(valor)
    ? 'Sin fondo'
    : cambiado ? 'Cambiado' : 'Como en el diseño';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          aria-label={`Elegir color: ${etiqueta.toLowerCase()}`}
          title={`Elegir color: ${etiqueta.toLowerCase()}`}
          className="w-9 h-9 rounded-lg border border-gray-200 shrink-0 cursor-pointer overflow-hidden hover:border-pink-400 transition-colors"
          style={{ backgroundColor: esHex(valor) ? valor : '#ffffff' }}
        />
        {/* El selector de color real; se abre al tocar el cuadrado de arriba. */}
        <input
          ref={entrada}
          type="color"
          className="sr-only"
          tabIndex={-1}
          value={esHex(valor) ? valor : '#ffffff'}
          onChange={(e) => alCambiar(e.target.value)}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-gray-600">{etiqueta}</p>
          <p className="text-[10px] text-gray-400">{estado}</p>
        </div>
        {cambiado && (
          <button
            type="button"
            onClick={alRestaurar}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-pink-600 hover:bg-pink-50 transition-colors shrink-0"
            title={`Volver al ${etiqueta.toLowerCase()} del diseño`}
          >
            <RotateCcw className="w-3 h-3" />
            Del diseño
          </button>
        )}
      </div>
      {extra}
    </div>
  );
};

interface ColorDeInvitacionProps {
  etiqueta: string;
  valor?: string;
  alCambiar: (hex: string) => void;
}

/** Un color de toda la invitación. Si todavía no se ha elegido, se ve con
 *  rayas neutras en lugar de fingir un color que la invitación no tiene. */
export const ColorDeInvitacion: React.FC<ColorDeInvitacionProps> = ({ etiqueta, valor, alCambiar }) => {
  const entrada = useRef<HTMLInputElement>(null);
  // El color elegido, o vacío si todavía no hay uno bien formado.
  const elegido = esHex(valor) ? valor : '';
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        aria-label={`Color ${etiqueta.toLowerCase()}`}
        title={`Cambiar el color ${etiqueta.toLowerCase()}`}
        className="w-8 h-8 rounded-lg border border-gray-200 shrink-0 cursor-pointer overflow-hidden hover:border-pink-400 transition-colors"
        style={elegido
          ? { backgroundColor: elegido }
          : { backgroundImage: 'repeating-linear-gradient(135deg, #f3f4f6 0 4px, #e5e7eb 4px 8px)' }}
      />
      <input
        ref={entrada}
        type="color"
        className="sr-only"
        tabIndex={-1}
        value={elegido || '#888888'}
        onChange={(e) => alCambiar(e.target.value)}
      />
      <span className="text-xs text-gray-600 truncate">{etiqueta}</span>
    </div>
  );
};
