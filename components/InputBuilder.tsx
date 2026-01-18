import React, { useEffect, useMemo, useState } from 'react';
import { Clipboard, Download, FileUp, Save } from 'lucide-react';
import { ppBasisDefaults } from './input-builder/basis';
import { solventOptions } from './input-builder/solvents';
import { TemplateData, loadTemplates, saveTemplates } from './input-builder/templates';
import { parseGeometryLines } from './input-builder/xyz';

const InputBuilder: React.FC = () => {
  const [xyzFileName, setXyzFileName] = useState<string | null>(null);
  const [xyzText, setXyzText] = useState('');
  const [charge, setCharge] = useState(0);
  const [multiplicity, setMultiplicity] = useState(1);
  const [method, setMethod] = useState('wb97x-d3bj');
  const [basis, setBasis] = useState('cc-pvtz');
  const [scfConvergence, setScfConvergence] = useState<'Normal' | 'Tight' | 'VeryTight'>('Normal');
  const [geometryOpt, setGeometryOpt] = useState(false);
  const [optTS, setOptTS] = useState(false);
  const [optConvergence, setOptConvergence] = useState<'NormalOpt' | 'TightOpt' | 'VeryTightOpt'>('NormalOpt');
  const [freq, setFreq] = useState(false);
  const [cpcm, setCpcm] = useState(false);
  const [solvent, setSolvent] = useState('Water');
  const [scaleGauss, setScaleGauss] = useState(1.2);
  const [elpropDipole, setElpropDipole] = useState(true);
  const [ppBasisBlock, setPpBasisBlock] = useState('');
  const [ppBasisTouched, setPpBasisTouched] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<TemplateData[]>(() => loadTemplates());

  const { geometryLines, elements } = useMemo(() => parseGeometryLines(xyzText), [xyzText]);
  const atomCount = geometryLines.length;
  const elementList = Array.from(new Set(elements));

  useEffect(() => {
    if (ppBasisTouched) return;
    const detected = elementList.find(element => ppBasisDefaults[element]);
    if (detected) {
      setPpBasisBlock(ppBasisDefaults[detected]);
      return;
    }
    setPpBasisBlock('');
  }, [elementList, ppBasisTouched]);

  const scfFlag = useMemo(() => {
    if (scfConvergence === 'Tight') return 'TightSCF';
    if (scfConvergence === 'VeryTight') return 'VeryTightSCF';
    return '';
  }, [scfConvergence]);

  const optFlag = optTS ? 'OptTS' : geometryOpt ? 'Opt' : '';
  const optConvFlag = geometryOpt || optTS ? optConvergence : '';
  const freqFlag = freq ? 'Freq' : '';
  const cpcmFlag = cpcm ? 'CPCM' : '';

  const orcaInput = useMemo(() => {
    const headerFlags = [
      method,
      basis,
      scfFlag,
      optFlag,
      optConvFlag !== 'NormalOpt' ? optConvFlag : '',
      freqFlag,
      cpcmFlag
    ].filter(Boolean);

    const lines: string[] = [];
    if (headerFlags.length > 0) {
      lines.push(`! ${headerFlags.join(' ')}`);
    }
    if (ppBasisBlock.trim()) {
      lines.push('%basis');
      lines.push(...ppBasisBlock.split(/\r?\n/).map(line => `  ${line}`));
      lines.push('end');
    }
    if (cpcm) {
      lines.push('%cpcm');
      lines.push(`  solvent ${solvent}`);
      lines.push(`  scale_gauss ${scaleGauss}`);
      lines.push('end');
    }
    if (elpropDipole) {
      lines.push('%elprop');
      lines.push('  dipole true');
      lines.push('end');
    }
    lines.push(`* xyz ${charge} ${multiplicity}`);
    lines.push(...geometryLines);
    lines.push('*');
    return lines.join('\n');
  }, [
    method,
    basis,
    scfFlag,
    optFlag,
    optConvFlag,
    freqFlag,
    cpcmFlag,
    ppBasisBlock,
    cpcm,
    solvent,
    scaleGauss,
    elpropDipole,
    charge,
    multiplicity,
    geometryLines
  ]);

  const handleFileSelect = async (file: File) => {
    const text = await file.text();
    const { geometryLines: parsedLines } = parseGeometryLines(text);
    setXyzFileName(file.name);
    setXyzText(parsedLines.join('\n'));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(orcaInput);
  };

  const handleDownload = () => {
    const blob = new Blob([orcaInput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orca_input.inp';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const payload: TemplateData = {
      name: templateName.trim(),
      xyzText,
      charge,
      multiplicity,
      method,
      basis,
      scfConvergence,
      geometryOpt,
      optTS,
      optConvergence,
      freq,
      cpcm,
      solvent,
      scaleGauss,
      elpropDipole,
      ppBasisBlock
    };

    const next = templates.filter(template => template.name !== payload.name);
    next.unshift(payload);
    setTemplates(next);
    saveTemplates(next);
  };

  const handleLoadTemplate = (template: TemplateData) => {
    setTemplateName(template.name);
    setXyzText(template.xyzText);
    setCharge(template.charge);
    setMultiplicity(template.multiplicity);
    setMethod(template.method);
    setBasis(template.basis);
    setScfConvergence(template.scfConvergence);
    setGeometryOpt(template.geometryOpt);
    setOptTS(template.optTS);
    setOptConvergence(template.optConvergence);
    setFreq(template.freq);
    setCpcm(template.cpcm);
    setSolvent(template.solvent);
    setScaleGauss(template.scaleGauss);
    setElpropDipole(template.elpropDipole);
    setPpBasisBlock(template.ppBasisBlock);
    setPpBasisTouched(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Step 1: XYZ を読み込む</h2>
          <p className="text-sm text-slate-500">XYZ ファイルを読み込み、原子情報を確認します。</p>
        </div>
        <div className="p-6 space-y-4">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
            <FileUp size={18} />
            XYZ を選択
            <input
              type="file"
              accept=".xyz"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
            />
          </label>
          {xyzFileName && (
            <p className="text-sm text-slate-600">Loaded: {xyzFileName}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-500">原子数</p>
              <p className="text-lg font-semibold text-slate-800">{atomCount}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 md:col-span-2">
              <p className="text-xs text-slate-500">元素一覧</p>
              <p className="text-sm text-slate-700">{elementList.length > 0 ? elementList.join(' ') : '---'}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">XYZ プレビュー</label>
            <textarea
              value={xyzText}
              onChange={(event) => setXyzText(event.target.value)}
              rows={8}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm font-mono text-slate-800 focus:border-blue-500 focus:ring-blue-500"
              placeholder="C 0.0000 0.0000 0.0000\nH 0.0000 0.0000 1.0890"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Charge</label>
              <input
                type="number"
                value={charge}
                onChange={(event) => setCharge(Number(event.target.value))}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Multiplicity</label>
              <input
                type="number"
                value={multiplicity}
                onChange={(event) => setMultiplicity(Number(event.target.value))}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Step 2: 計算条件を指定</h2>
          <p className="text-sm text-slate-500">ORCA 入力の計算条件を整えます。</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Method (functional)</label>
              <input
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Basis</label>
              <input
                value={basis}
                onChange={(event) => setBasis(event.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">SCF 収束</label>
              <select
                value={scfConvergence}
                onChange={(event) => setScfConvergence(event.target.value as 'Normal' | 'Tight' | 'VeryTight')}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Normal">Normal</option>
                <option value="Tight">Tight</option>
                <option value="VeryTight">VeryTight</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Geometry optimization</label>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={geometryOpt}
                    onChange={(event) => {
                      setGeometryOpt(event.target.checked);
                      if (!event.target.checked) {
                        setOptTS(false);
                      }
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Opt ON
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={optTS}
                    onChange={(event) => {
                      setOptTS(event.target.checked);
                      if (event.target.checked) {
                        setGeometryOpt(true);
                      }
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  OptTS ON
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={freq}
                    onChange={(event) => setFreq(event.target.checked)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Freq ON
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Opt 収束</label>
              <select
                value={optConvergence}
                onChange={(event) => setOptConvergence(event.target.value as 'NormalOpt' | 'TightOpt' | 'VeryTightOpt')}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                disabled={!geometryOpt && !optTS}
              >
                <option value="NormalOpt">NormalOpt</option>
                <option value="TightOpt">TightOpt</option>
                <option value="VeryTightOpt">VeryTightOpt</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CPCM</label>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={cpcm}
                    onChange={(event) => setCpcm(event.target.checked)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  CPCM ON
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={elpropDipole}
                    onChange={(event) => setElpropDipole(event.target.checked)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  %elprop dipole true
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Solvent</label>
              <input
                list="solvent-list"
                value={solvent}
                onChange={(event) => setSolvent(event.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
              />
              <datalist id="solvent-list">
                {solventOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">scale_gauss</label>
              <input
                type="number"
                step="0.1"
                value={scaleGauss}
                onChange={(event) => setScaleGauss(Number(event.target.value))}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">%basis (pp 基底/ECP)</label>
            <textarea
              value={ppBasisBlock}
              onChange={(event) => {
                setPpBasisBlock(event.target.value);
                setPpBasisTouched(true);
              }}
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm font-mono text-slate-800 focus:border-blue-500 focus:ring-blue-500"
              placeholder={'NewGTO I "def2-TZVPP"\nNewECP I "def2-TZVPP"'}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Step 3: インプット生成・出力</h2>
            <p className="text-sm text-slate-500">ORCA input をリアルタイムで確認できます。</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Clipboard size={18} />
                Copy to clipboard
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
              >
                <Download size={18} />
                Download .inp
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">テンプレ名を付けて保存</label>
              <div className="flex flex-wrap gap-2">
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  className="flex-1 min-w-[220px] rounded-lg border-slate-300 bg-slate-50 border p-2.5 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: wb97x-d3bj-water"
                />
                <button
                  onClick={handleSaveTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Save size={18} />
                  Save
                </button>
              </div>
              {templates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">保存済みテンプレート</p>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(template => (
                      <button
                        key={template.name}
                        onClick={() => handleLoadTemplate(template)}
                        className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs hover:bg-slate-200"
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200">Generated ORCA Input</h3>
          </div>
          <pre className="p-6 text-xs md:text-sm font-mono text-emerald-100 whitespace-pre-wrap">
{orcaInput || 'XYZ を読み込むと入力が表示されます。'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default InputBuilder;
