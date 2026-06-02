import React, { useState } from 'react';
import axios from 'axios';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  Database,
  ArrowRight
} from 'lucide-react';

interface MappingSetup {
  dateCol: string;
  descriptionCol: string;
  amountCol: string;
  debitCol?: string;
  creditCol?: string;
  categoryCol?: string;
  subcategoryCol?: string;
  paymentMethodCol?: string;
  accountCol?: string;
  notesCol?: string;
  tagsCol?: string;
}

interface FileAnalysis {
  filename: string;
  headers: string[];
  detectedMapping: MappingSetup;
  totalRows: number;
  previewRows: any[];
}

interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
  suggestion: any;
}

export const Import: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'upload' | 'mapping' | 'validated' | 'success'>('upload');
  
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [mapping, setMapping] = useState<MappingSetup>({
    dateCol: '', descriptionCol: '', amountCol: '', categoryCol: '', accountCol: '', notesCol: ''
  });

  const [validCount, setValidCount] = useState(0);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post('/api/transactions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data as FileAnalysis;
      setAnalysis(data);
      setMapping(data.detectedMapping);
      setStatus('mapping');
    } catch (err) {
      alert('Failed to analyze selected statement.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingFieldChange = (key: keyof MappingSetup, val: string) => {
    setMapping(prev => ({ ...prev, [key]: val }));
  };

  const triggerValidation = async () => {
    if (!analysis || !file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const fileParseRes = await axios.post('/api/transactions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const res = await axios.post('/api/transactions/import-validate', {
        fileData: fileParseRes.data.previewRows,
        mapping
      });

      setValidCount(res.data.validCount);
      setErrors(res.data.errors);
      setStatus('validated');
    } catch (err) {
      alert('Validation process failed.');
    } finally {
      setLoading(false);
    }
  };

  const triggerImport = async () => {
    if (!analysis || !file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const parseRes = await axios.post('/api/transactions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await axios.post('/api/transactions/import', {
        fileData: parseRes.data.previewRows,
        mapping
      });

      setStatus('success');
      setTimeout(() => {
        setFile(null);
        setAnalysis(null);
        setStatus('upload');
      }, 2500);
    } catch (err) {
      alert('Failed to complete statement imports.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12 select-none text-black dark:text-white">
      
      {/* HEADER SECTION */}
      <div className="pb-2 border-b border-slate-100 dark:border-slate-900">
        <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Statement importer</span>
        <h1 className="text-xl font-black font-sans leading-none mt-1">STATEMENT IMPORT</h1>
      </div>

      {/* TRACK STATUS BAR */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 p-3 rounded-2xl text-[9px] font-bold text-slate-400 uppercase">
        <span className={status === 'upload' ? 'text-black dark:text-white font-black' : ''}>1. Upload</span>
        <ArrowRight className="w-3 h-3 text-slate-350" />
        <span className={status === 'mapping' ? 'text-black dark:text-white font-black' : ''}>2. Map</span>
        <ArrowRight className="w-3 h-3 text-slate-350" />
        <span className={status === 'validated' ? 'text-black dark:text-white font-black' : ''}>3. Verify</span>
      </div>

      {/* STEP 1: UPLOAD BOX */}
      {status === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`h-56 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center space-y-3 p-6 transition-colors relative cursor-pointer ${
            dragActive
              ? 'border-black bg-slate-50 dark:border-white dark:bg-slate-950/40'
              : 'border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white bg-white dark:bg-black shadow-premium'
          }`}
        >
          <input
            type="file"
            id="file-upload-input"
            accept=".csv, .xlsx, .xls, .json"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="file-upload-input" className="absolute inset-0 w-full h-full cursor-pointer flex flex-col items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Analyzing statement...</span>
              </div>
            ) : (
              <>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-2xl mb-1 border dark:border-slate-900 shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">Drag & Drop Bank Excel / CSV</h3>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Supports CSV, XLSX, JSON</p>
                <button type="button" className="mt-3 py-1.5 px-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-bold uppercase">
                  Select File
                </button>
              </>
            )}
          </label>
        </div>
      )}

      {/* STEP 2: FIELDS MAPPING FORM */}
      {status === 'mapping' && analysis && (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-premium space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-900">
            <FileSpreadsheet className="w-5 h-5 text-slate-500" />
            <div>
              <h3 className="font-extrabold text-xs">Configure Field Mappings</h3>
              <p className="text-[9px] text-slate-400 font-semibold uppercase">{analysis.filename}</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs font-semibold">
            
            <div className="grid grid-cols-2 items-center gap-3">
              <span className="text-[10px] font-bold uppercase text-slate-400">Transaction Date</span>
              <select
                value={mapping.dateCol}
                onChange={e => handleMappingFieldChange('dateCol', e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none cursor-pointer text-[10px]"
              >
                <option value="">Select Column</option>
                {analysis.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 items-center gap-3">
              <span className="text-[10px] font-bold uppercase text-slate-400">Description / Payee</span>
              <select
                value={mapping.descriptionCol}
                onChange={e => handleMappingFieldChange('descriptionCol', e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none cursor-pointer text-[10px]"
              >
                <option value="">Select Column</option>
                {analysis.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 items-center gap-3">
              <span className="text-[10px] font-bold uppercase text-slate-400">Transaction Amount</span>
              <select
                value={mapping.amountCol}
                onChange={e => handleMappingFieldChange('amountCol', e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none cursor-pointer text-[10px]"
              >
                <option value="">Select Column</option>
                {analysis.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-900">
              <span className="text-[10px] font-bold uppercase text-slate-400">Category (Optional)</span>
              <select
                value={mapping.categoryCol || ''}
                onChange={e => handleMappingFieldChange('categoryCol', e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none cursor-pointer text-[10px]"
              >
                <option value="">Skip Column</option>
                {analysis.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-2 pt-4 border-t border-slate-100 dark:border-slate-900">
            <button
              onClick={() => setStatus('upload')}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[10px]"
            >
              Back
            </button>
            <button
              onClick={triggerValidation}
              className="flex-1 py-2 bg-black hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-105 text-white dark:text-black rounded-xl font-bold text-[10px] shadow-sm border dark:border-white/10"
            >
              Verify statement
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DATA VALIDATED REPORTS LIST */}
      {status === 'validated' && (
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-premium text-center space-y-3">
            <h3 className="font-extrabold text-xs">Statement Audit Report</h3>
            
            <div className="flex justify-around items-center pt-2">
              <div>
                <span className="text-[8px] uppercase font-black text-slate-400">Clean Records</span>
                <span className="font-black text-base text-emerald-500 block">{validCount}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-900" />
              <div>
                <span className="text-[8px] uppercase font-black text-slate-400">Errors Flagged</span>
                <span className={`font-black text-base ${errors.length > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'} block`}>
                  {errors.length}
                </span>
              </div>
            </div>
          </div>

          {/* Validation errors list */}
          {errors.length > 0 && (
            <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3 max-h-52 overflow-y-auto">
              <h4 className="text-[9px] uppercase font-black tracking-widest text-slate-400">Verification Alerts</h4>
              
              <div className="space-y-2">
                {errors.map((err, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 text-[10px] space-y-1">
                    <div className="flex justify-between items-center text-slate-400 font-extrabold text-[8px] uppercase">
                      <span>Row {err.row}</span>
                      <span className="text-rose-500">{err.field} error</span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{err.message}</p>
                    <p className="text-emerald-500 font-semibold">Recommendation: {err.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={() => setStatus('mapping')}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs"
            >
              Back
            </button>
            <button
              onClick={triggerImport}
              disabled={validCount === 0}
              className="flex-1 py-2.5 bg-black hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-105 text-white dark:text-black rounded-xl font-bold text-xs disabled:opacity-50"
            >
              Import {validCount} Records
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CONGRATS SYNC */}
      {status === 'success' && (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-premium text-center space-y-3 max-w-[280px] mx-auto">
          <Database className="w-6 h-6 text-slate-500 mx-auto animate-bounce" />
          <h3 className="font-black text-xs">Statement Merged</h3>
          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">Transactions audited and recorded into your active statement history.</p>
          <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin mx-auto mt-2" />
        </div>
      )}
    </div>
  );
};
