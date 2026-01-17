import { ParsedData } from '../types';

// Regex Helpers based on Python script
const FLOAT_PATTERN = "[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[Ee][-+]?\\d+)?";

export const parseOutputContent = (content: string): ParsedData => {
  const lines = content.split('\n');
  
  let frequencies: number[] = [];
  let mass: number | null = null;
  let rotationalConstants: number[] = [];
  let cavityVolume: number | null = null;
  let dipoleVector: [number, number, number] | null = null;
  let polarizabilityTensor: [[number, number, number], [number, number, number], [number, number, number]] | null = null;

  // 1. Frequencies
  // Look for "Frequencies -- 123.4 567.8 ..."
  const freqRegex = /Frequencies\s+--\s+(.*)/g;
  let freqMatch;
  while ((freqMatch = freqRegex.exec(content)) !== null) {
    const nums = freqMatch[1].trim().split(/\s+/).map(Number);
    frequencies.push(...nums.filter(n => !isNaN(n)));
  }

  // 2. Mass
  // "Molecular mass: ...", "Total Mass ...", "Molecular weight = ..."
  const massRegexes = [
    new RegExp(`Molecular mass:\\s+(${FLOAT_PATTERN})`, 'i'),
    new RegExp(`Total\\s+Mass.*?(${FLOAT_PATTERN})`, 'i'),
    new RegExp(`Molecular weight\\s+=\\s+(${FLOAT_PATTERN})`, 'i')
  ];
  for (const regex of massRegexes) {
    const m = content.match(regex);
    if (m) {
      mass = parseFloat(m[1]);
      break;
    }
  }

  // 3. Rotational Constants
  // Python script looks for "Rotational constants in cm-1: ... A B C"
  // Also support Gaussian "Rotational constants (GHZ): ...", convert to cm-1 later if needed, but python specifically asks for cm-1
  // We'll stick to cm-1 regex first.
  const rotCmRegex = new RegExp(`Rotational\\s+constants\\s+in\\s+cm-1:.*?(${FLOAT_PATTERN})\\s+(${FLOAT_PATTERN})\\s+(${FLOAT_PATTERN})`, 'is');
  const rotMatch = content.match(rotCmRegex);
  if (rotMatch) {
    rotationalConstants = [parseFloat(rotMatch[1]), parseFloat(rotMatch[2]), parseFloat(rotMatch[3])];
  } else {
    // Fallback: Try to find "Rotational constants (GHZ):" and convert? 
    // Or "Rotational temperatures" and convert back?
    // For now, let's look for the standard patterns.
  }

  // 4. Cavity Volume
  const volRegex = new RegExp(`(?:Volume|Cavity\\s+Volume).*?(${FLOAT_PATTERN})`, 'is');
  const volMatch = content.match(volRegex);
  if (volMatch) {
    cavityVolume = parseFloat(volMatch[1]);
  }

  // 5. Dipole Vector (x, y, z)
  // "Total Dipole Moment : ... X Y Z"
  const dipRegex = new RegExp(`Total\\s+Dipole\\s+Moment.*?(${FLOAT_PATTERN})\\s+(${FLOAT_PATTERN})\\s+(${FLOAT_PATTERN})`, 'i');
  const dipMatch = content.match(dipRegex);
  if (dipMatch) {
    dipoleVector = [parseFloat(dipMatch[1]), parseFloat(dipMatch[2]), parseFloat(dipMatch[3])];
  } else {
    // Fallback for Gaussian "Dipole moment (field-independent basis, Debye):"
    // X= ... Y= ... Z= ...  Tot= ...
    // This is complex regex, sticking to the provided python script style first which seems to match ORCA/standard out.
  }

  // 6. Polarizability Tensor
  // "The raw cartesian tensor (atomic units)"
  // followed by 3 lines of 3 floats
  const polarHeaderRegex = /The\s+raw\s+cartesian\s+tensor\s*\((?:atomic\s+units|a\.u\.)\)/i;
  const polarHeaderMatch = content.match(polarHeaderRegex);
  if (polarHeaderMatch && polarHeaderMatch.index !== undefined) {
    const remainder = content.slice(polarHeaderMatch.index + polarHeaderMatch[0].length);
    const lineFloatPattern = `(${FLOAT_PATTERN})\\s+(${FLOAT_PATTERN})\\s+(${FLOAT_PATTERN})`;
    const tensorRegex = new RegExp(lineFloatPattern, 'g');
    
    const rows: [number, number, number][] = [];
    let rowMatch;
    let count = 0;
    while ((rowMatch = tensorRegex.exec(remainder)) !== null && count < 3) {
      rows.push([parseFloat(rowMatch[1]), parseFloat(rowMatch[2]), parseFloat(rowMatch[3])]);
      count++;
    }
    
    if (rows.length === 3) {
      polarizabilityTensor = [rows[0], rows[1], rows[2]];
    }
  }

  return {
    frequencies,
    mass,
    rotationalConstants,
    cavityVolume,
    dipoleVector,
    polarizabilityTensor
  };
};

export const validateRequiredData = (
  freqData: ParsedData | null,
  vol10Data: ParsedData | null,
  vol12Data: ParsedData | null,
  dipGasData: ParsedData | null,
  dipLiqData: ParsedData | null
): string[] => {
  const errors: string[] = [];

  // 1. Freq File Requirements
  if (!freqData) {
    errors.push('Frequency file (Freq)');
  } else {
    if (freqData.frequencies.length === 0) errors.push('Vibrational frequencies (Freq)');
    if (freqData.mass === null && (!vol12Data || vol12Data.mass === null)) errors.push('Molecular mass (Freq or Vol 1.2)');
  }

  // 2. Volume Files Requirements
  if (!vol10Data || vol10Data.cavityVolume === null) errors.push('Cavity Volume (Alpha=1.0)');
  if (!vol12Data || vol12Data.cavityVolume === null) errors.push('Cavity Volume (Alpha=1.2)');

  // 3. Rotational Requirements (Need constants and dipoles)
  // Constants usually in freq or vol_12
  const hasRot = (freqData && freqData.rotationalConstants.length === 3) || (vol12Data && vol12Data.rotationalConstants.length === 3);
  if (!hasRot) errors.push('Rotational constants (A, B, C) (Freq or Vol 1.2)');

  // 4. Dipole/Polar Requirements
  if (!dipGasData) {
    errors.push('Gas Phase file');
  } else {
    if (!dipGasData.dipoleVector) errors.push('Dipole Moment Vector (Gas)');
    if (!dipGasData.polarizabilityTensor) errors.push('Polarizability Tensor (Gas)');
  }

  if (!dipLiqData || !dipLiqData.dipoleVector) errors.push('Dipole Moment Vector (Liquid)');

  return errors;
};
