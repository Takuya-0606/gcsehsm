import React, { useRef } from 'react';
import { FileUp, FileText, CheckCircle, XCircle } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  subLabel?: string;
  onFileSelect: (file: File) => void;
  fileName: string | null;
  hasError?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  label, 
  subLabel, 
  onFileSelect, 
  fileName,
  hasError 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        {subLabel && <span className="text-xs text-slate-500">{subLabel}</span>}
      </div>
      
      <div 
        onClick={handleClick}
        className={`
          relative flex items-center justify-between p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
          ${hasError ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'}
          ${fileName ? 'bg-white border-solid border-emerald-400' : ''}
        `}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {fileName ? (
            <div className="p-2 bg-emerald-100 rounded-md text-emerald-600">
              <FileText size={20} />
            </div>
          ) : (
            <div className="p-2 bg-slate-100 rounded-md text-slate-400">
              <FileUp size={20} />
            </div>
          )}
          
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-medium truncate ${fileName ? 'text-slate-900' : 'text-slate-400'}`}>
              {fileName || 'Click to select .out file'}
            </span>
          </div>
        </div>

        <input 
          type="file" 
          ref={inputRef}
          onChange={handleChange}
          accept=".out,.log,.txt"
          className="hidden"
        />

        {fileName && (
          <CheckCircle className="text-emerald-500 ml-2 flex-shrink-0" size={18} />
        )}
        {hasError && !fileName && (
          <XCircle className="text-red-500 ml-2 flex-shrink-0" size={18} />
        )}
      </div>
    </div>
  );
};

export default FileUploader;
