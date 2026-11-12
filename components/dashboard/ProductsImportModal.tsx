'use client';

// Importar productos desde un CSV (Mis Productos). El archivo se lee y se valida en el navegador SOLO para mostrar la
// vista previa; al confirmar se manda el JSON ya parseado a POST /api/products/import, que revalida todo en el servidor
// y aplica el límite del plan (todo o nada). Los valores del archivo se muestran siempre como texto de React.

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Loader2, UploadCloud, Download, X, Check, AlertTriangle, FileText } from 'lucide-react';
import {
  IMPORT_LIMITS, TEMPLATE_HEADERS, mapHeaders, validateImport, checkProductLimit, templateCsv,
  type ExistingProduct, type ImportReport, type RawRow, type RowStatus,
} from '@/lib/productsImport';

type Props = {
  existing: ExistingProduct[];
  hasFeatured: boolean;
  currentCount: number;
  maxProds: number;
  isAdmin: boolean;
  onClose: () => void;
  onImported: () => void;
  onChangePlan: () => void;
};

type Done = { created: number; categoriesCreated: number; duplicates: number; invalid: number };

const STATUS_STYLE: Record<RowStatus, { label: string; cls: string }> = {
  ok: { label: 'Se crea', cls: 'bg-[#E8F7F1] text-[#17A06D]' },
  duplicate: { label: 'Duplicado', cls: 'bg-amber-100 text-amber-700' },
  error: { label: 'Error', cls: 'bg-alert/10 text-alert' },
};

// Excel en español guarda CSV en Windows-1252: se prueba UTF-8 estricto y, si falla, Windows-1252.
function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

export default function ProductsImportModal({ existing, hasFeatured, currentCount, maxProds, isAdmin, onClose, onImported, onChangePlan }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + templateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-productos.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setReport(null);
    setRawRows([]);
    setFileName('');
    setError(null);
    setLimitHit(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setReport(null);
    setLimitHit(false);
    if (!file) return;
    if (file.size > IMPORT_LIMITS.maxFileBytes) {
      setError('El archivo pesa más de 2 MB. Dividilo en archivos más chicos.');
      return;
    }
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError('Subí un archivo .csv (en Excel: Guardar como → CSV).');
      return;
    }
    try {
      const text = decodeCsv(await file.arrayBuffer());
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        preview: IMPORT_LIMITS.maxRows + 1, // una de más para detectar que se pasa del máximo
      });
      if (!parsed.data || parsed.data.length === 0) {
        setError('No encontré filas en el archivo. Revisá que tenga encabezados y al menos un producto.');
        return;
      }
      const { rows, missing } = mapHeaders(parsed.data);
      if (missing.length > 0) {
        setError(`Faltan columnas obligatorias: ${missing.join(', ')}. Descargá la plantilla para ver el formato.`);
        return;
      }
      const result = validateImport(rows, { existing, hasFeatured });
      if (result.fatal) {
        setError(result.fatal);
        return;
      }
      setFileName(file.name.slice(0, 80));
      setRawRows(rows);
      setReport(result);
    } catch {
      setError('No pude leer el archivo. Probá guardarlo de nuevo como CSV.');
    }
  };

  const limit = report ? checkProductLimit(currentCount, report.counts.ok, maxProds, isAdmin) : null;
  const canConfirm = !!report && report.counts.ok > 0 && !!limit?.ok && !submitting;

  const confirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rawRows }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone({ created: body.created ?? 0, categoriesCreated: body.categoriesCreated ?? 0, duplicates: body.duplicates ?? 0, invalid: body.invalid ?? 0 });
        onImported();
      } else if (res.status === 409 && body?.error === 'limite_del_plan') {
        setLimitHit(true);
        setError(`Tu plan permite hasta ${body.limit} productos y ya tenés ${body.current}. No se importó nada.`);
      } else if (res.status === 429) {
        setError('Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.');
      } else if (res.status === 403) {
        setError('Tu plan o tu prueba no permite importar productos en este momento.');
      } else if (body?.error === 'error_al_importar') {
        setDone({ created: body.created ?? 0, categoriesCreated: body.categoriesCreated ?? 0, duplicates: body.duplicates ?? 0, invalid: body.invalid ?? 0 });
        setError(`Se produjo un error a mitad de la importación: se crearon ${body.created ?? 0} y faltaron ${body.pending ?? 0}. Podés volver a subir el archivo: los que ya se crearon se omiten como duplicados.`);
        onImported();
      } else {
        setError(body?.message || 'No se pudo importar. Probá de nuevo en un momento.');
      }
    } catch {
      setError('No se pudo conectar. Revisá tu internet y probá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Importar productos">
      <div className="bg-white w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2 min-w-0">
            <UploadCloud size={22} className="text-fresco shrink-0" />
            <span className="truncate">Importar productos</span>
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {done ? (
            <div className="text-center py-6 space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#E8F7F1] text-fresco flex items-center justify-center"><Check size={28} /></div>
              <p className="text-lg font-extrabold text-gray-900">Se crearon {done.created} producto{done.created === 1 ? '' : 's'}</p>
              <p className="text-sm text-gray-500">
                {done.categoriesCreated > 0 && <>Categorías nuevas: {done.categoriesCreated}. </>}
                {done.duplicates > 0 && <>Duplicados omitidos: {done.duplicates}. </>}
                {done.invalid > 0 && <>Filas con error omitidas: {done.invalid}.</>}
              </p>
              {error && <p className="text-sm text-alert font-medium">{error}</p>}
            </div>
          ) : !report ? (
            <>
              <p className="text-sm text-gray-600">
                Cargá varios productos de una vez con un archivo <b>CSV</b> (en Excel: Guardar como → CSV). Máximo {IMPORT_LIMITS.maxRows} filas y 2 MB.
                Las categorías que no existan se crean solas y los productos repetidos (mismo nombre y categoría) se omiten.
              </p>
              <button onClick={downloadTemplate} className="w-full min-h-[44px] px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50">
                <Download size={18} /> Descargar plantilla CSV
              </button>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 space-y-1">
                <p className="font-bold text-gray-600">Columnas</p>
                <p className="break-words">{TEMPLATE_HEADERS.join(' · ')}</p>
                <p><b>tipo_venta</b>: unidad o peso. <b>variaciones</b>: etiqueta:precio separadas por | (ej: 100g:1500|1kg:12000); obligatorias si es por peso. <b>destacado</b>: si o no. <b>imagen_url</b>: solo links https.</p>
              </div>
              <label className="block">
                <span className="sr-only">Elegir archivo CSV</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:min-h-[44px] file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-bold file:bg-fresco file:text-white hover:file:bg-[#17A06D]"
                />
              </label>
              {error && <p className="text-sm text-alert font-medium flex gap-2"><AlertTriangle size={18} className="shrink-0 mt-0.5" /><span>{error}</span></p>}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
                <FileText size={16} className="shrink-0" /> <span className="truncate">{fileName}</span>
              </div>
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-[#E8F7F1] py-3"><p className="text-xl font-extrabold text-[#17A06D]">{report.counts.ok}</p><p className="text-[10px] font-bold uppercase text-[#17A06D]">Se crean</p></div>
                <div className="rounded-2xl bg-amber-50 py-3"><p className="text-xl font-extrabold text-amber-700">{report.counts.duplicates}</p><p className="text-[10px] font-bold uppercase text-amber-700">Duplicados</p></div>
                <div className="rounded-2xl bg-alert/10 py-3"><p className="text-xl font-extrabold text-alert">{report.counts.errors}</p><p className="text-[10px] font-bold uppercase text-alert">Con error</p></div>
              </div>
              <p className="text-xs text-gray-500">Los duplicados y las filas con error se omiten; el resto se crea al confirmar.</p>

              {limit && !limit.ok && (
                <div className="rounded-2xl border border-alert/30 bg-alert/5 p-3 space-y-2">
                  <p className="text-sm font-bold text-alert flex gap-2"><AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <span>Te pasás del límite de tu plan: permite {maxProds} productos, tenés {currentCount} y querés sumar {report.counts.ok} (sobran {limit.excess}). No se importa nada hasta que entre completo.</span>
                  </p>
                  <button onClick={onChangePlan} className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-fresco text-white text-sm font-bold hover:bg-[#17A06D]">Cambiar de plan</button>
                </div>
              )}
              {error && <p className="text-sm text-alert font-medium flex gap-2"><AlertTriangle size={18} className="shrink-0 mt-0.5" /><span>{error}</span></p>}
              {limitHit && (
                <button onClick={onChangePlan} className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-fresco text-white text-sm font-bold hover:bg-[#17A06D]">Cambiar de plan</button>
              )}

              {/* Vista previa: una tarjeta por fila (legible a 360 px) */}
              <ul className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {report.rows.map((r) => (
                  <li key={r.line} className="rounded-xl border border-gray-100 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 break-words">{r.preview.nombre || '(sin nombre)'}</p>
                        <p className="text-xs text-gray-500 break-words">Fila {r.line} · {r.preview.categoria || 'General'} · {r.preview.precio ? `$${r.preview.precio}` : 'sin precio'}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${STATUS_STYLE[r.status].cls}`}>{STATUS_STYLE[r.status].label}</span>
                    </div>
                    {r.errors.map((m, i) => <p key={`e${i}`} className="mt-1 text-xs text-alert break-words">• {m}</p>)}
                    {r.warnings.map((m, i) => <p key={`w${i}`} className="mt-1 text-xs text-amber-700 break-words">• {m}</p>)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Pie con acciones */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {done ? (
            <button onClick={onClose} className="min-h-[44px] px-6 py-3 rounded-2xl bg-fresco text-white text-sm font-bold hover:bg-[#17A06D]">Cerrar</button>
          ) : report ? (
            <>
              <button onClick={reset} disabled={submitting} className="min-h-[44px] px-5 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Elegir otro archivo</button>
              <button onClick={confirm} disabled={!canConfirm} className="min-h-[44px] px-6 py-3 rounded-2xl bg-fresco text-white text-sm font-bold hover:bg-[#17A06D] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Importar {report.counts.ok} producto{report.counts.ok === 1 ? '' : 's'}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="min-h-[44px] px-5 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
          )}
        </div>
      </div>
    </div>
  );
}
