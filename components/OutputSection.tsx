import React from 'react';
import { CalculationResult } from '../types';
import { ArrowLeft, Download, AlertTriangle } from 'lucide-react';

interface OutputSectionProps {
  result: CalculationResult;
  onBack: () => void;
}

const OutputSection: React.FC<OutputSectionProps> = ({ result, onBack }) => {
  
  const formatNum = (num: number, digits = 4) => num.toFixed(digits);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          Back to Inputs
        </button>
        <button className="flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors font-medium">
          <Download size={18} />
          Export Report
        </button>
      </div>

      {result.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-amber-800">Calculation Warnings</h4>
            <ul className="list-disc list-inside text-sm text-amber-700 mt-1">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Entropy Section */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">I. Entropy</h2>
          <p className="text-blue-100 text-sm opacity-90">[J/mol/K]</p>
        </div>
        <div className="p-6">
            <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Translational entropy</span>
                    <span className="font-mono text-lg font-bold text-slate-800">{formatNum(result.entropy.trans)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Rotational entropy</span>
                    <span className="font-mono text-lg font-bold text-slate-800">{formatNum(result.entropy.rot)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Vibrational entropy</span>
                    <span className="font-mono text-lg font-bold text-slate-800">{formatNum(result.entropy.vib)}</span>
                </div>
                <div className="flex justify-between items-center py-3 mt-2 bg-slate-50 rounded-lg px-4">
                    <span className="text-slate-800 font-bold">Total Entropy</span>
                    <span className="font-mono text-xl font-bold text-blue-600">{formatNum(result.entropy.total)}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Internal Energy Section */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">II. Internal Energy</h2>
          <p className="text-emerald-100 text-sm opacity-90">[kJ/mol]</p>
        </div>
        <div className="p-6">
            <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Translational energy</span>
                    <span className="font-mono text-lg font-bold text-slate-800">{formatNum(result.internalEnergy.trans)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Rotational energy</span>
                    <span className="font-mono text-lg font-bold text-slate-800">{formatNum(result.internalEnergy.rot)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Vibrational energy</span>
                    <span className="font-mono text-lg font-bold text-slate-800">{formatNum(result.internalEnergy.vib)}</span>
                </div>
                <div className="flex justify-between items-center py-3 mt-2 bg-slate-50 rounded-lg px-4">
                    <span className="text-slate-800 font-bold">Total Internal Energy</span>
                    <span className="font-mono text-xl font-bold text-emerald-600">{formatNum(result.internalEnergy.total)}</span>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default OutputSection;
