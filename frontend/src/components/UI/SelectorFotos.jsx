import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Plus, X } from 'lucide-react';

const MAX_MB = 5;
const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'];

export default function SelectorFotos({ fotos, onChange, max = 5, obligatoria = false }) {
  const inputRef = useRef(null);
  const [aviso, setAviso] = useState('');
  const [previas, setPrevias] = useState([]);

  useEffect(() => {
    const urls = fotos.map((f) => URL.createObjectURL(f));
    setPrevias(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [fotos]);

  useEffect(() => {
    if (fotos.length === 0) setAviso('');
  }, [fotos.length]);

  const agregar = (lista) => {
    const nuevas = Array.from(lista || []);
    const validas = nuevas.filter((f) => TIPOS_IMAGEN.includes(f.type) && f.size <= MAX_MB * 1024 * 1024);
    const avisos = [];
    if (validas.length < nuevas.length) avisos.push(`Solo se aceptan imágenes JPG, PNG o WEBP de máximo ${MAX_MB} MB.`);
    const combinadas = [...fotos, ...validas];
    if (combinadas.length > max) avisos.push(`Máximo ${max} fotos.`);
    onChange(combinadas.slice(0, max));
    setAviso(avisos.join(' '));
  };

  const quitar = (idx) => {
    onChange(fotos.filter((_, i) => i !== idx));
    setAviso('');
  };

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
        <ImageIcon size={14} /> Fotos {obligatoria ? 'de evidencia' : ''}
        {obligatoria && <span className="text-red-500">*</span>}
        <span className="normal-case font-normal text-slate-400">
          ({fotos.length}/{max}) · {obligatoria ? 'obligatoria al menos 1' : 'opcional'}
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        {previas.map((src, idx) => (
          <div key={src} className="relative w-20 h-20">
            <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
            <button
              type="button"
              onClick={() => quitar(idx)}
              title="Quitar foto"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300 flex items-center justify-center shadow-sm"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {fotos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
              obligatoria && fotos.length === 0
                ? 'border-isp-teal/50 text-isp-teal hover:bg-isp-teal/5'
                : 'border-slate-300 text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Plus size={18} /> Agregar
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          agregar(e.target.files);
          e.target.value = '';
        }}
      />
      {aviso && <p className="text-xs text-amber-600 mt-1.5">{aviso}</p>}
    </div>
  );
}
