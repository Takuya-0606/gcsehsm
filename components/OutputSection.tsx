import React from 'react';
import { CalculationRow } from '../types';
import { ArrowLeft, Download, AlertTriangle } from 'lucide-react';

interface OutputSectionProps {
  result: CalculationRow[];
  onBack: () => void;
}

const OutputSection: React.FC<OutputSectionProps> = ({ result, onBack }) => {
  
  const formatNum = (num: number, digits = 4) => num.toFixed(digits);
  const warnings = result.flatMap(row => row.result.warnings.map(w => `T=${row.temperature} K: ${w}`));

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

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-amber-800">Calculation Warnings</h4>
            <ul className="list-disc list-inside text-sm text-amber-700 mt-1">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Thermo Summary Table</h2>
          <p className="text-blue-100 text-sm opacity-90">Entropy [J/mol/K] / Internal Energy [kJ/mol]</p>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="min-w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="px-3 py-2 font-semibold">T (K)</th>
                <th className="px-3 py-2 font-semibold">S<sub>trans</sub></th>
                <th className="px-3 py-2 font-semibold">S<sub>rot</sub></th>
                <th className="px-3 py-2 font-semibold">S<sub>vib</sub></th>
                <th className="px-3 py-2 font-semibold">S<sub>total</sub></th>
                <th className="px-3 py-2 font-semibold">U<sub>trans</sub></th>
                <th className="px-3 py-2 font-semibold">U<sub>rot</sub></th>
                <th className="px-3 py-2 font-semibold">U<sub>vib</sub></th>
                <th className="px-3 py-2 font-semibold">U<sub>total</sub></th>
              </tr>
            </thead>
            <tbody>
              {result.map(row => (
                <tr key={row.temperature} className="bg-slate-50 text-slate-700">
                  <td className="px-3 py-2 font-semibold text-slate-900">{formatNum(row.temperature, 2)}</td>
                  <td className="px-3 py-2 font-mono">{formatNum(row.result.entropy.trans)}</td>
                  <td className="px-3 py-2 font-mono">{formatNum(row.result.entropy.rot)}</td>
                  <td className="px-3 py-2 font-mono">{formatNum(row.result.entropy.vib)}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-blue-700">{formatNum(row.result.entropy.total)}</td>
                  <td className="px-3 py-2 font-mono">{formatNum(row.result.internalEnergy.trans)}</td>
                  <td className="px-3 py-2 font-mono">{formatNum(row.result.internalEnergy.rot)}</td>
                  <td className="px-3 py-2 font-mono">{formatNum(row.result.internalEnergy.vib)}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-emerald-700">{formatNum(row.result.internalEnergy.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default OutputSection;
