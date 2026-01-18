import React from 'react';
import { AppState, FileType } from '../types';
import FileUploader from './FileUploader';
import { ArrowRight, Thermometer } from 'lucide-react';

interface InputSectionProps {
  appState: AppState;
  onFileChange: (type: FileType, file: File) => void;
  onTempChange: (temp: number) => void;
  onTempModeChange: (mode: 'single' | 'range') => void;
  onTempRangeChange: (field: 'start' | 'end' | 'step', value: number) => void;
  onCalculate: () => void;
}

const InputSection: React.FC<InputSectionProps> = ({ 
  appState, 
  onFileChange, 
  onTempChange, 
  onTempModeChange,
  onTempRangeChange,
  onCalculate 
}) => {
  
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">I. Frequency Section</h2>
          <p className="text-sm text-slate-500">Upload the primary frequency calculation output.</p>
        </div>
        <div className="p-6">
          <FileUploader 
            label="Frequency File" 
            fileName={appState.files.freq.name}
            onFileSelect={(f) => onFileChange('freq', f)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">II. Volume Section</h2>
          <p className="text-sm text-slate-500">Upload files for cavity scaling factors.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUploader 
            label="Alpha = 1.0" 
            subLabel="(Standard Volume)"
            fileName={appState.files.vol_10.name}
            onFileSelect={(f) => onFileChange('vol_10', f)}
          />
          <FileUploader 
            label="Alpha = 1.2" 
            subLabel="(Expanded Volume)"
            fileName={appState.files.vol_12.name}
            onFileSelect={(f) => onFileChange('vol_12', f)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">III. Dipole Moment Section</h2>
          <p className="text-sm text-slate-500">Upload gas and liquid phase calculation outputs.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUploader 
            label="Gas Phase" 
            fileName={appState.files.dip_gas.name}
            onFileSelect={(f) => onFileChange('dip_gas', f)}
          />
          <FileUploader 
            label="Liquid Phase" 
            fileName={appState.files.dip_liq.name}
            onFileSelect={(f) => onFileChange('dip_liq', f)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">IV. Temperature</h2>
        </div>
        <div className="p-6">
           <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="radio"
                  name="temperature-mode"
                  checked={appState.temperatureMode === 'single'}
                  onChange={() => onTempModeChange('single')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Single temperature
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="radio"
                  name="temperature-mode"
                  checked={appState.temperatureMode === 'range'}
                  onChange={() => onTempModeChange('range')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Multiple temperatures (range)
              </label>
            </div>

            {appState.temperatureMode === 'single' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Temperature (K)</label>
                <div className="relative">
                  <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                  <input 
                    type="number" 
                    value={appState.temperature}
                    onChange={(e) => onTempChange(Number(e.target.value))}
                    className="pl-10 block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 298.15"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start (K)</label>
                  <input
                    type="number"
                    value={appState.temperatureRange.start}
                    onChange={(e) => onTempRangeChange('start', Number(e.target.value))}
                    className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 280"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End (K)</label>
                  <input
                    type="number"
                    value={appState.temperatureRange.end}
                    onChange={(e) => onTempRangeChange('end', Number(e.target.value))}
                    className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 320"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Step (K)</label>
                  <input
                    type="number"
                    value={appState.temperatureRange.step}
                    onChange={(e) => onTempRangeChange('step', Number(e.target.value))}
                    className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 5"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 pb-12">
        <button 
          onClick={onCalculate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95"
        >
          Process Data
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default InputSection;
