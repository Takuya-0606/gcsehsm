export interface TemplateData {
  name: string;
  xyzText: string;
  charge: number;
  multiplicity: number;
  method: string;
  basis: string;
  scfConvergence: 'Normal' | 'Tight' | 'VeryTight';
  geometryOpt: boolean;
  optTS: boolean;
  optConvergence: 'NormalOpt' | 'TightOpt' | 'VeryTightOpt';
  freq: boolean;
  cpcm: boolean;
  solvent: string;
  scaleGauss: number;
  elpropDipole: boolean;
  ppBasisBlock: string;
}

const TEMPLATE_STORAGE_KEY = 'orca-input-templates';

export const loadTemplates = (): TemplateData[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TemplateData[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveTemplates = (templates: TemplateData[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
};
