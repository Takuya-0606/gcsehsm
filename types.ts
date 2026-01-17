export type FileType = 'freq' | 'vol_10' | 'vol_12' | 'dip_gas' | 'dip_liq';

export interface ParsedData {
  frequencies: number[];
  mass: number | null;
  rotationalConstants: number[];
  cavityVolume: number | null;
  dipoleVector: [number, number, number] | null;
  polarizabilityTensor:
    | [[number, number, number], [number, number, number], [number, number, number]]
    | null;
}

export interface FileState {
  file: File | null;
  content: string | null;
  name: string | null;
  parsed: ParsedData | null;
}

export interface AppState {
  files: Record<FileType, FileState>;
  temperature: number;
}

export interface CalculationResult {
  entropy: {
    trans: number;
    rot: number;
    vib: number;
    total: number;
  };
  internalEnergy: {
    trans: number;
    rot: number;
    vib: number;
    total: number;
  };
  warnings: string[];
}
