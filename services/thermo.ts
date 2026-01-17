import { ParsedData, CalculationResult } from '../types';

// ---- constants (from Python script) ----
const kB = 1.380649e-23;
const h  = 6.62607015e-34;
const c_m = 299792458.0;
const c_cm = c_m * 100.0;
const R  = 8.31446261815324;
const NA = 6.02214076e23;

const amu_kg = 1.66053906660e-27;
const bohr_m = 5.29177210903e-11;
const Eh_J = 4.3597447222071e-18;

// ---- Math Helpers ----

const dot3 = (a: number[], b: number[]): number => {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
};

const matvec3 = (M: number[][], v: number[]): number[] => {
  return [
    M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
    M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
    M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
  ];
};

const norm3 = (v: number[]): number => {
  return Math.sqrt(dot3(v, v));
};

const _langevin = (x: number): number => {
  const ax = Math.abs(x);
  if (ax < 1.0e-3) {
      // series: x/3 - x^3/45 + 2 x^5/945
      const x2 = x*x;
      return (x/3.0) - (x*x2/45.0) + (2.0*x*x2*x2/945.0);
  }
  if (ax > 50.0) {
      return 1.0 - 1.0/x;
  }
  return (1.0 / Math.tanh(x)) - (1.0 / x);
};

const _keff_from_muE = (muE_J: number, T: number): number => {
  if (muE_J <= 0.0) return 0.0;
  const x = muE_J / (kB * T);
  return muE_J * _langevin(x);
};

// ---- Thermo Models ----

const ho_entropy = (nu_cm: number, T: number): number => {
  if (nu_cm <= 0.0) return 0.0;
  const x = (h * c_cm * nu_cm) / (kB * T);
  // Avoid overflow
  if (x > 100) return 0.0; 
  const ex = Math.exp(x);
  return R * (x / (ex - 1.0) - Math.log(1.0 - Math.exp(-x)));
};

const _E_one = (v_cm1: number, T: number): number => {
    if (v_cm1 <= 0.0) return 0.0;
    const x = (h * c_cm) / (kB * T);
    const t = x * v_cm1;
    if (t < 1.0e-12) return 0.0;
    const e = Math.exp(-t);
    return R * T * (t * (0.5 + e / (1.0 - e)));
};

// Quasi-Translational
const calculateTransProperties = (V10: number, V12: number, mass: number, T: number) => {
    // V10, V12 in Bohr^3
    const Vfree = Math.pow(Math.pow(V12, 1.0/3.0) - Math.pow(V10, 1.0/3.0), 3.0);
    const L_m = (Math.pow(Vfree * 3 / (4 * Math.PI), 1.0/3.0)) * bohr_m;
    const m_kg = mass * amu_kg;
    
    let nu_tr_cm = 0;
    if (L_m > 0) {
        const omega = Math.sqrt(2.0 * Math.PI * kB * T / m_kg) * 1.0 / L_m;
        const nu_hz = omega / (2.0 * Math.PI);
        nu_tr_cm = nu_hz / c_cm;
    }

    // 3 degrees of freedom treated as HO
    const S = 3.0 * ho_entropy(nu_tr_cm, T);
    const freqs = [nu_tr_cm, nu_tr_cm, nu_tr_cm];
    return { S, freqs };
};

// Quasi-Rotational
const calculateRotProperties = (
    rotCm: number[], 
    muLiq: number[], 
    muGas: number[], 
    alpha: number[][], 
    T: number
) => {
    const mu_star = [
        muLiq[0] - muGas[0],
        muLiq[1] - muGas[1],
        muLiq[2] - muGas[2]
    ];
    const mu_star_norm = norm3(mu_star);

    let freqs: number[] = [0, 0, 0];

    if (mu_star_norm > 0) {
        const u = [
            mu_star[0]/mu_star_norm,
            mu_star[1]/mu_star_norm,
            mu_star[2]/mu_star_norm
        ];
        const au = matvec3(alpha, u);
        const P = dot3(u, au);
        
        if (P > 0) {
            const muE_Eh = (mu_star_norm**2) / P;
            const muE_J = muE_Eh * Eh_J;
            const k_eff_J = _keff_from_muE(muE_J, T); // Using average-curvature by default

            // Calculate frequencies for A, B, C
            freqs = rotCm.map(Bcm => {
                if (Bcm === 0.0) return 0.0;
                const B_m = Bcm * 100.0;
                const I = h / (8.0 * Math.PI**2 * c_m * B_m);
                const nu_hz = (1.0 / (2.0 * Math.PI)) * Math.sqrt(k_eff_J / I);
                return nu_hz / c_cm;
            });
        }
    }

    let S = 0;
    freqs.forEach(nu => {
        S += ho_entropy(nu, T);
    });

  　return { S, freqs };
};

// ---- Main Calculation Function ----

export const calculateThermoProperties = (
  freqData: ParsedData,
  vol10Data: ParsedData,
  vol12Data: ParsedData,
  dipGasData: ParsedData,
  dipLiqData: ParsedData,
  tempK: number
): CalculationResult => {
  
  const warnings: string[] = [];

  // 1. Data Gathering
  // Priority for Mass: Freq -> Vol12 -> Error
  const mass = freqData.mass || vol12Data.mass || 0;
  
  // Rotational Constants: Freq -> Vol12 -> Error
  const rotConsts = (freqData.rotationalConstants.length === 3) 
    ? freqData.rotationalConstants 
    : vol12Data.rotationalConstants;

  // 2. Translational (Quasi-Translational)
  let S_trans = 0;
  let freq_trans: number[] = [];

  if (vol10Data.cavityVolume != null && vol12Data.cavityVolume != null && mass > 0) {
    const res = calculateTransProperties(vol10Data.cavityVolume, vol12Data.cavityVolume, mass, tempK);
    S_trans = res.S;
    freq_trans = res.freqs;
  } else {
    warnings.push("Could not calculate Quasi-Translational properties (Missing Volume or Mass).");
  }

  // 3. Rotational (Quasi-Rotational)
  let S_rot = 0;
  let freq_rot: number[] = [];

  if (
    rotConsts.length === 3 && 
    dipLiqData.dipoleVector && 
    dipGasData.dipoleVector && 
    dipGasData.polarizabilityTensor
  ) {
    const res = calculateRotProperties(
        rotConsts,
        dipLiqData.dipoleVector,
        dipGasData.dipoleVector,
        dipGasData.polarizabilityTensor,
        tempK
    );
    S_rot = res.S;
    freq_rot = res.freqs;
  } else {
    warnings.push("Could not calculate Quasi-Rotational properties (Missing Dipoles, Tensor, or Rot Constants).");
  }

  // 4. Vibrational (Harmonic Oscillator)
  let S_vib = 0;
  const freq_vib: number[] = [];

  // Use all frequencies from Freq file
  for (const nu of freqData.frequencies) {
      if (nu > 0) {
          S_vib += ho_entropy(nu, tempK);
          freq_vib.push(nu);
      }
  }

  const E_trans = 0.5 * freq_trans.reduce((sum, v) => sum + _E_one(v, tempK), 0.0);
  const E_rot = 0.5 * freq_rot.reduce((sum, v) => sum + _E_one(v, tempK), 0.0);
  const E_vib = freq_vib.reduce((sum, v) => sum + _E_one(v, tempK), 0.0);

  // Convert E to kJ/mol (currently J/mol)
  const U_trans_kJ = E_trans / 1000;
  const U_rot_kJ = E_rot / 1000;
  const U_vib_kJ = E_vib / 1000;
  
  return {
    entropy: {
      trans: S_trans,
      rot: S_rot,
      vib: S_vib,
      total: S_trans + S_rot + S_vib
    },
    internalEnergy: {
      trans: U_trans_kJ,
      rot: U_rot_kJ,
      vib: U_vib_kJ,
      total: U_trans_kJ + U_rot_kJ + U_vib_kJ
    },
    warnings
  };
};
