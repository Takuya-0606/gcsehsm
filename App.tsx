import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppState, FileType, FileState, CalculationResult } from './types';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import { parseOutputContent, validateRequiredData } from './services/parser';
import { calculateThermoProperties } from './services/thermo';
import { FlaskConical } from 'lucide-react';

const initialFileState: FileState = {
  file: null,
  content: null,
  name: null,
  parsed: null
};

const App: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [appState, setAppState] = useState<AppState>({
    files: {
      freq: { ...initialFileState },
      vol_10: { ...initialFileState },
      vol_12: { ...initialFileState },
      dip_gas: { ...initialFileState },
      dip_liq: { ...initialFileState },
    },
    temperature: 298.15
  });

  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleFileChange = async (type: FileType, file: File) => {
    const text = await file.text();
    const parsed = parseOutputContent(text);
    
    setAppState(prev => ({
      ...prev,
      files: {
        ...prev.files,
        [type]: {
          file,
          content: text,
          name: file.name,
          parsed
        }
      }
    }));
  };

  const handleTempChange = (temp: number) => {
    setAppState(prev => ({ ...prev, temperature: temp }));
  };

  const handleCalculate = () => {
    setErrorMsg(null);
    setLoading(true);

    setTimeout(() => {
      // 1. Get Parsed Data
      const freq = appState.files.freq.parsed;
      const vol10 = appState.files.vol_10.parsed;
      const vol12 = appState.files.vol_12.parsed;
      const dipGas = appState.files.dip_gas.parsed;
      const dipLiq = appState.files.dip_liq.parsed;

      // 2. Validate
      const missingData = validateRequiredData(freq, vol10, vol12, dipGas, dipLiq);
      
      if (missingData.length > 0) {
        // Japanese error message style as requested
        setErrorMsg(`Error: The following information was not found in the output files: ${missingData.join(', ')}.`);
        setLoading(false);
        return;
      }

      // 3. Calculate
      // Safe to cast as non-null because validation passed
      const calcResult = calculateThermoProperties(
        freq!,
        vol10!,
        vol12!,
        dipGas!,
        dipLiq!,
        appState.temperature
      );

      setResult(calcResult);
      setStep(2);
      setLoading(false);
    }, 600); // Small delay for UX
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FlaskConical size={24} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
            ThermoCalc Pro
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="max-w-3xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            {errorMsg}
          </div>
        )}

        {step === 1 && (
          <InputSection 
            appState={appState}
            onFileChange={handleFileChange}
            onTempChange={handleTempChange}
            onCalculate={handleCalculate}
          />
        )}

        {step === 2 && result && (
          <OutputSection 
            result={result}
            onBack={() => setStep(1)}
          />
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">Processing Output Files...</p>
        </div>
      )}

    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;
