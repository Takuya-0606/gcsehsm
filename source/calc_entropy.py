#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ---- constants ----
kB = 1.380649e-23
h  = 6.62607015e-34
c_m = 299792458.0
c_cm = c_m * 100.0
R  = 8.31446261815324
NA = 6.02214076e23

amu_kg = 1.66053906660e-27
bohr_m = 5.29177210903e-11
Eh_J = 4.3597447222071e-18
Eh_to_Jmol = Eh_J * NA

D_to_au = 0.393430307

# ---- orientational anharmonic softening (average-curvature HO) ----
def _langevin(x: float) -> float:
    """Langevin function L(x) = coth(x) - 1/x with numerically stable branches."""
    ax = abs(x)
    if ax < 1.0e-3:
        # series: x/3 - x^3/45 + 2 x^5/945
        x2 = x*x
        return (x/3.0) - (x*x2/45.0) + (2.0*x*x2*x2/945.0)
    if ax > 50.0:
        # coth(x) ~ 1 for large x
        return 1.0 - 1.0/x
    return (1.0 / math.tanh(x)) - (1.0 / x)

def _keff_from_muE(muE_J: float, T: float) -> float:
    """Return k_eff (J/rad^2) for V(Θ)=muE(1-cosΘ) mapped to 1/2 k_eff Θ^2."""
    if muE_J <= 0.0:
        return 0.0
    x = muE_J / (kB * T)
    return muE_J * _langevin(x)

_FLOAT = r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?"

def read_text(p: Path) -> str:
    return p.read_text(errors="ignore")

def find_out(base: Path, rel: str) -> Path:
    p = base / rel
    if p.exists():
        return p
    p2 = base / (rel + ".out")
    if p2.exists():
        return p2
    d = (base / rel).parent
    if d.exists():
        outs = sorted(d.glob("*.out"))
        if outs:
            return outs[0]
    raise FileNotFoundError(f"Missing file: {base / rel}")

def dot3(a, b) -> float:
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]

def matvec3(M, v):
    return (
        M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
        M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
        M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
    )

def norm3(v) -> float:
    return math.sqrt(dot3(v, v))

# ---- Robust Parsing Functions ----

def parse_final_energy_Eh(t: str) -> float:
    m = re.search(r"FINAL\s+SINGLE\s+POINT\s+ENERGY.*?(%s)" % _FLOAT, t, re.IGNORECASE)
    if not m:
        raise ValueError("FINAL SINGLE POINT ENERGY not found.")
    return float(m.group(1))

def parse_mol_weight_amu(t: str) -> float:
    m = re.search(r"Total\s+Mass.*?(%s)" % _FLOAT, t, re.IGNORECASE)
    if m:
        return float(m.group(1))
    raise ValueError("Total Mass was not found.")

def parse_cavity_volume_bohr3(text: str) -> float:
    m = re.search(r"Cavity\s+Volume.*?(%s)" % _FLOAT, text, re.IGNORECASE)
    if not m:
        raise ValueError("Cavity Volume line not found.")
    return float(m.group(1))

def parse_rot_constants_cm(t: str) -> Tuple[float, float, float]:
    # "Rotational constants in cm-1: ... 0.1 0.2 0.3"
    m = re.search(
        r"Rotational\s+constants\s+in\s+cm-1:.*?(%s)\s+(%s)\s+(%s)" % (_FLOAT, _FLOAT, _FLOAT),
        t, re.IGNORECASE
    )
    if m:
        return (float(m.group(1)), float(m.group(2)), float(m.group(3)))
    raise ValueError("Rotational constants not found.")

def parse_dipole_vec_au(t: str) -> Tuple[float, float, float]:
    # "Total Dipole Moment : ... 0.1 0.2 0.3"
    m = re.search(
        r"Total\s+Dipole\s+Moment.*?(%s)\s+(%s)\s+(%s)" % (_FLOAT, _FLOAT, _FLOAT),
        t,
        re.IGNORECASE | re.MULTILINE,
    )
    if not m:
        raise ValueError("Total Dipole Moment vector (a.u.) not found.")
    return (float(m.group(1)), float(m.group(2)), float(m.group(3)))

def parse_polar_tensor_au(t: str) -> Tuple[Tuple[float, float, float],
                                           Tuple[float, float, float],
                                           Tuple[float, float, float]]:
    header_pattern = r"The\s+raw\s+cartesian\s+tensor\s*\((?:atomic\s+units|a\.u\.)\)"
    block_match = re.search(header_pattern, t, re.IGNORECASE)
    if not block_match:
        raise ValueError("Polarizability tensor not found.")

    remaining_text = t[block_match.end():]
    line_pattern = r"(%s)\s+(%s)\s+(%s)" % (_FLOAT, _FLOAT, _FLOAT)
    matches = re.findall(line_pattern, remaining_text)
    
    if len(matches) < 3:
        raise ValueError("Could not find 3 rows of polarizability tensor.")

    row1 = (float(matches[0][0]), float(matches[0][1]), float(matches[0][2]))
    row2 = (float(matches[1][0]), float(matches[1][1]), float(matches[1][2]))
    row3 = (float(matches[2][0]), float(matches[2][1]), float(matches[2][2]))
    return (row1, row2, row3)

def parse_vib_entropy_JmolK(t: str, T: float) -> float:
    m = re.search(
        r"Vibrational\s+entropy.*?(%s)\s*kcal/mol" % _FLOAT,
        t, re.IGNORECASE
    )
    if m:
        ts_kcalmol = float(m.group(1))
        return (ts_kcalmol * 4184.0) / T

    raise ValueError("Vibrational entropy not found.")

# ---- thermo model ----
def ho_entropy(nu_cm: float, T: float) -> float:
    """Quantum HO entropy per mode (J/mol/K) from wavenumber (cm^-1)."""
    if nu_cm <= 0.0:
        return 0.0
    x = (h * c_cm * nu_cm) / (kB * T)
    try:
        ex = math.exp(x)
        return R * (x / (ex - 1.0) - math.log(1.0 - math.exp(-x)))
    except OverflowError:
        return 0.0

# Quasi-Translational frequencies
def vfree_bohr3(V12: float, V10: float) -> float:
    return (V12**(1.0/3.0) - V10**(1.0/3.0))**3

def nu_trans_cm(Vfree: float, mw_amu: float, T: float) -> float:
    L_m = ((Vfree*3/(4*math.pi))**(1.0/3.0)) * bohr_m
    m_kg = mw_amu * amu_kg
    if L_m <= 0.0:
        return 0.0
    omega = math.sqrt(2.0 * math.pi * kB * T / m_kg) * 1.0 / L_m
    nu_hz = omega / (2.0 * math.pi)
    return nu_hz / c_cm

# Quasi-Rotational frequencies
def nu_rot_cm(rot_cm, mu_liq_au, mu_gas_au, alpha_au, T: float, *, nu_floor_cm: float = 0.0, use_avg_curv: bool = True):
    A_cm, B_cm, C_cm = rot_cm
    mu_star = (mu_liq_au[0]-mu_gas_au[0], 
               mu_liq_au[1]-mu_gas_au[1], 
               mu_liq_au[2]-mu_gas_au[2]
               )
    mu_star_norm = norm3(mu_star)
    if mu_star_norm == 0.0:
        return (0.0, 0.0, 0.0)

    u = (mu_star[0]/mu_star_norm, 
         mu_star[1]/mu_star_norm, 
         mu_star[2]/mu_star_norm)

    au = matvec3(alpha_au, u)
    P = dot3(u, au)  # u^T alpha u
    if P <= 0.0:
        # fallback if Polarizability is weird
        return (0.0, 0.0, 0.0)

    # muE in Eh (since mu, alpha are in a.u.)
    muE_Eh = (mu_star_norm**2) / P
    muE_J = muE_Eh * Eh_J  # J per molecule

    k_eff_J = _keff_from_muE(muE_J, T) if use_avg_curv else muE_J

    def inertia_from_Bcm(Bcm: float) -> float:
        if Bcm == 0.0: return 1e99
        B_m = Bcm * 100.0
        return h / (8.0 * math.pi**2 * c_m * B_m)

    def wavenumber_from_I(I: float) -> float:
        if I == 0.0: return 0.0
        nu_hz = (1.0 / (2.0 * math.pi)) * math.sqrt(k_eff_J / I)
        nu_cm = nu_hz / c_cm
        if nu_floor_cm > 0.0 and nu_cm < nu_floor_cm:
            return nu_floor_cm
        return nu_cm

    Ia = inertia_from_Bcm(A_cm)
    Ib = inertia_from_Bcm(B_cm)
    Ic = inertia_from_Bcm(C_cm)

    return (wavenumber_from_I(Ia), wavenumber_from_I(Ib), wavenumber_from_I(Ic))


def S_isomer_JmolK(E_Eh: Dict[str, float], T: float) -> float:
    if not E_Eh: return 0.0
    Emin = min(E_Eh.values())
    q = 0.0
    num = 0.0
    for Ei in E_Eh.values():
        dE = (Ei - Emin) * Eh_to_Jmol
        w = math.exp(-dE / (R * T))
        q += w
        num += dE * w
    if q == 0: return 0.0
    avg = num / q
    return R * (math.log(q) + avg / (R * T))


# ---- main ----
@dataclass
class Row:
    name: str
    S_trans: float
    S_rot: float
    S_vib: float
    S_isomer: float
    S_total: float


def main(root: Path, T: float, nu_floor_rot: float = 0.0, use_avg_curv: bool = True) -> None:
    if (root / "gas/orca.out").exists() or (root / "gas").exists():
        all_dirs = [root]
    else:
        all_dirs = sorted([p for p in root.glob("[0-9][0-9][0-9]-*") if p.is_dir()])
    
    if not all_dirs:
        print(f"No directories found in {root}")
        return

    confs = []
    print(f"Scanning {len(all_dirs)} directories...")
    
    for d in all_dirs:
        try:
            find_out(d, "gas/orca.out")
            find_out(d, "gas/polar/orca.out")
            find_out(d, "scale_1.0/orca.out")
            find_out(d, "scale_1.2/orca.out")
            find_out(d, "scale_1.2/polar/orca.out")
            confs.append(d)
        except FileNotFoundError:
            continue

    if not confs:
        print("No valid complete directories found (missing files).")
        return

    # S_isomer from gas energies across all VALID conformers
    E: Dict[str, float] = {}
    for d in confs:
        try:
            g = read_text(find_out(d, "gas/orca.out"))
            E[d.name] = parse_final_energy_Eh(g)
        except Exception as e:
            print(f"Warning: Failed to read Energy for {d.name}: {e}")

    Siso = S_isomer_JmolK(E, T)

    rows: List[Row] = []
    for d in confs:
        try:
            t10  = read_text(find_out(d, "scale_1.0/orca.out"))
            t12  = read_text(find_out(d, "scale_1.2/orca.out"))
            t12p = read_text(find_out(d, "scale_1.2/polar/orca.out"))
            tgp  = read_text(find_out(d, "gas/polar/orca.out"))

            V10 = parse_cavity_volume_bohr3(t10)
            V12 = parse_cavity_volume_bohr3(t12)
            Vfree = vfree_bohr3(V12, V10)

            mw = parse_mol_weight_amu(t12)
            nu_tr = nu_trans_cm(Vfree, mw, T)
            Strans = 3.0 * ho_entropy(nu_tr, T)

            rot = parse_rot_constants_cm(t12)
            mu_liq = parse_dipole_vec_au(t12p)
            mu_gas = parse_dipole_vec_au(tgp)
            alpha = parse_polar_tensor_au(tgp)
            nua, nub, nuc = nu_rot_cm(rot, mu_liq, mu_gas, alpha, T, nu_floor_cm=nu_floor_rot, use_avg_curv=use_avg_curv)
            Srot = ho_entropy(nua, T) + ho_entropy(nub, T) + ho_entropy(nuc, T)
            Svib = parse_vib_entropy_JmolK(t12, T)
            Stot = Strans + Srot + Svib + Siso
            rows.append(Row(d.name, Strans, Srot, Svib, Siso, Stot))
            
        except Exception as e:
            print(f"Error processing {d.name}: {e}")
            continue

    out = root / "entropy_summary.csv"
    try:
        with out.open("w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["conformer", "S_trans(J/mol/K)", "S_rot(J/mol/K)", "S_vib(J/mol/K)",
                        "S_isomer(J/mol/K)", "S_total(J/mol/K)"])
            for r in rows:
                w.writerow([r.name, f"{r.S_trans:.6f}", f"{r.S_rot:.6f}", f"{r.S_vib:.6f}",
                            f"{r.S_isomer:.6f}", f"{r.S_total:.6f}"])
        print(f"Successfully wrote results to: {out.resolve()}")
        
        print(f"T = {T:.2f} K, S_isomer = {Siso:.6f} J/mol/K")
        print("conformer,S_trans,S_rot,S_vib,S_isomer,S_total")
        for r in rows:
            print(f"{r.name},{r.S_trans:.6f},{r.S_rot:.6f},{r.S_vib:.6f},{r.S_isomer:.6f},{r.S_total:.6f}")
            
    except PermissionError:
        print(f"Error: Could not write to {out}. Check permissions.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Root directory containing 001-* folders")
    ap.add_argument("--T", type=float, default=298.15, help="Temperature (K)")
    ap.add_argument("--nu-floor-rot", type=float, default=0.0,
                    help="Minimum librational wavenumber (cm^-1) for rotational HO modes (0 disables).")
    ap.add_argument("--no-avg-curv", action="store_true",
                    help="Disable average-curvature softening; use plain HO k=muE.")
    a = ap.parse_args()
    main(Path(a.root).resolve(), float(a.T), nu_floor_rot=float(a.nu_floor_rot), use_avg_curv=(not a.no_avg_curv))

