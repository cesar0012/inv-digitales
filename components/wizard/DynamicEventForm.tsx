import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { EventPack, EventFormData, FieldDef, RepeatItem, SectionDef } from '../../services/composeService';

/**
 * Form generated from the event's knowledge pack. Repeatable groups (parents,
 * padrinos, damas, chambelanes, places, itinerary, gifts) have no fixed
 * limit: "Agregar otra…" adds a row, rows can be reordered and removed.
 */

interface Props {
  pack: EventPack;
  data: EventFormData;
  onChange: (next: EventFormData) => void;
  missingKeys: Set<string>;
}

const inputClass = (invalid: boolean) =>
  `w-full bg-white border ${invalid ? 'border-red-300 ring-1 ring-red-200' : 'border-pink-200 hover:border-pink-400'} px-3 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all text-[15px] placeholder:text-gray-400`;

export const emptyItem = (field: FieldDef): RepeatItem => {
  const item: RepeatItem = {};
  for (const f of field.itemFields || []) item[f.key] = f.type === 'checkbox' ? false : '';
  return item;
};

/** Initial data: repeat groups start with their suggested number of empty rows. */
export const initialFormData = (pack: EventPack): EventFormData => {
  const data: EventFormData = {};
  for (const s of pack.sections) {
    for (const f of s.fields) {
      if (f.type === 'repeat') data[f.key] = Array.from({ length: f.suggested || 0 }, () => emptyItem(f));
      else data[f.key] = f.type === 'checkbox' ? false : '';
    }
  }
  return data;
};

interface FieldInputProps {
  field: FieldDef;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
  invalid: boolean;
  id: string;
  data: EventFormData;
}

const FieldInput: React.FC<FieldInputProps> = ({ field, value, onChange, invalid, id, data }) => {
  if (field.type === 'checkbox') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none py-2">
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-pink-500" />
        {field.label}
      </label>
    );
  }
  if (field.type === 'textarea') {
    return <textarea id={id} rows={3} value={String(value || '')} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={inputClass(invalid) + ' resize-none'} />;
  }
  if (field.type === 'select' && field.optionsFrom) {
    return (
      <select id={id} value={String(value || '')} onChange={(e) => onChange(e.target.value)} className={inputClass(invalid)}>
        <option value="">Selecciona…</option>
        {field.optionsFrom.map((o) => {
          const fromData = o.labelFrom ? String(data[o.labelFrom] || '').trim() : '';
          return <option key={o.value} value={o.value}>{fromData || o.fallback || o.value}</option>;
        })}
      </select>
    );
  }
  if (field.type === 'select' && !field.allowCustom) {
    return (
      <select id={id} value={String(value || '')} onChange={(e) => onChange(e.target.value)} className={inputClass(invalid)}>
        <option value="">Selecciona…</option>
        {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === 'select') {
    // Suggestions plus free text (e.g. a padrinos role the list doesn't have).
    const listId = `${id}-options`;
    return (
      <>
        <input id={id} list={listId} value={String(value || '')} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || 'Elige o escribe…'} className={inputClass(invalid)} />
        <datalist id={listId}>{(field.options || []).map((o) => <option key={o} value={o} />)}</datalist>
      </>
    );
  }
  const type = field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text';
  return <input id={id} type={type} value={String(value || '')} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={inputClass(invalid)} />;
};

const Label: React.FC<{ field: FieldDef; htmlFor: string }> = ({ field, htmlFor }) =>
  field.type === 'checkbox' ? null : (
    <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {field.label} {field.required && <span className="text-red-400">*</span>}
    </label>
  );

interface RepeatProps {
  field: FieldDef;
  items: RepeatItem[];
  onChange: (items: RepeatItem[]) => void;
  missingKeys: Set<string>;
  data: EventFormData;
}

const RepeatGroup: React.FC<RepeatProps> = ({ field, items, onChange, missingKeys, data }) => {
  const update = (index: number, key: string, value: string | boolean) => {
    const next = items.map((it, i) => (i === index ? { ...it, [key]: value } : it));
    onChange(next);
  };
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };
  const removeAt = (index: number) => onChange(items.filter((_, i) => i !== index));
  const atMax = !!field.max && items.length >= field.max;
  const add = () => { if (!atMax) onChange([...items, emptyItem(field)]); };
  const groupMissing = missingKeys.has(field.key);

  return (
    <div className="flex flex-col gap-3">
      {field.notice && (
        <p className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" /> {field.notice}
        </p>
      )}
      {items.map((item, index) => (
        <div key={index} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-pink-700">{field.itemLabel || 'Elemento'} {index + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir" className="p-1.5 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Bajar" className="p-1.5 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
              <button type="button" onClick={() => removeAt(index)} aria-label={`Quitar ${field.itemLabel || 'elemento'} ${index + 1}`} className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(field.itemFields || []).map((f) => {
              const id = `f-${field.key}-${index}-${f.key}`;
              const wide = f.type === 'textarea' || (f.key === 'nombre' || f.key === 'nombres' || f.key === 'lugar' || f.key === 'actividad');
              return (
                <div key={f.key} className={`flex flex-col gap-1 ${wide ? 'sm:col-span-2' : ''}`}>
                  <Label field={f} htmlFor={id} />
                  <FieldInput field={f} id={id} data={data} value={item[f.key] ?? ''} invalid={missingKeys.has(`${field.key}.${index}.${f.key}`)} onChange={(v) => update(index, f.key, v)} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {atMax ? (
        <p className="text-xs text-gray-500">{field.maxNotice || `Máximo ${field.max}.`}</p>
      ) : (
        <button type="button" onClick={add} className={`self-start flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed ${groupMissing ? 'border-red-300 text-red-500' : 'border-pink-300 text-pink-600'} hover:bg-pink-50 text-sm font-semibold transition-colors`}>
          <Plus className="w-4 h-4" /> {items.length === 0 ? `Agregar ${String(field.itemLabel || '').toLowerCase()}` : field.addLabel || 'Agregar otro'}
        </button>
      )}
    </div>
  );
};

const Section: React.FC<{ section: SectionDef; data: EventFormData; set: (k: string, v: EventFormData[string]) => void; missingKeys: Set<string> }> = ({ section, data, set, missingKeys }) => (
  <section className="bg-white/80 rounded-3xl border border-pink-200 shadow-sm p-5 flex flex-col gap-4" aria-labelledby={`sec-${section.id}`}>
    <div>
      <h3 id={`sec-${section.id}`} className="text-lg font-bold text-gray-800">{section.title}</h3>
      {section.description && <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>}
    </div>
    {section.fields.map((field) => {
      if (field.type === 'repeat') {
        return (
          <div key={field.key} className="flex flex-col gap-2">
            {field.title && <h4 className="text-sm font-semibold text-gray-700">{field.title}</h4>}
            <RepeatGroup field={field} items={(data[field.key] as RepeatItem[]) || []} onChange={(items) => set(field.key, items)} missingKeys={missingKeys} data={data} />
          </div>
        );
      }
      const id = `f-${field.key}`;
      return (
        <div key={field.key} className="flex flex-col gap-1">
          <Label field={field} htmlFor={id} />
          <FieldInput field={field} id={id} data={data} value={(data[field.key] as string | boolean) ?? ''} invalid={missingKeys.has(field.key)} onChange={(v) => set(field.key, v)} />
        </div>
      );
    })}
  </section>
);

export const DynamicEventForm: React.FC<Props> = ({ pack, data, onChange, missingKeys }) => {
  const set = (key: string, value: EventFormData[string]) => onChange({ ...data, [key]: value });
  return (
    <div className="flex flex-col gap-4">
      {pack.sections.map((s) => <Section key={s.id} section={s} data={data} set={set} missingKeys={missingKeys} />)}
    </div>
  );
};
