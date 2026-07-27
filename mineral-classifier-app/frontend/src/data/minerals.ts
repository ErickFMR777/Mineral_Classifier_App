/**
 * Canonical mineral reference data.
 *
 * `data/minerals.json` at the repo root is the single source of truth, shared
 * by the SPA and the serverless API so the two can never drift apart. It is
 * bundled at build time, which keeps the catalog instant and lets the browser
 * enrich a classification without a round trip.
 */
import mineralsJson from '../../../../data/minerals.json';
import type { MineralInfo } from '../types';

export interface CanonicalMineral {
  id: number;
  name: string;
  category: string;
  icon: string;
  chemical_formula: string;
  /** Formula with Unicode subscripts, for display in the catalog cards. */
  formula_display: string;
  hardness: string;
  hardness_short: string;
  color: string;
  color_short: string;
  luster: string;
  luster_short: string;
  crystal_system: string;
  crystal_short: string;
  density: string;
  streak: string;
  cleavage: string;
  formation: string[];
  occurrence: string[];
  uses: string[];
  description: string;
}

export const MINERALS = mineralsJson as CanonicalMineral[];

export const MINERALS_BY_NAME: Record<string, CanonicalMineral> = Object.fromEntries(
  MINERALS.map((m) => [m.name, m]),
);

export const CATEGORIES: string[] = [
  'All',
  ...Array.from(new Set(MINERALS.map((m) => m.category))),
];

/**
 * Merge the geological record into a prediction — the client-side equivalent of
 * the enrichment `classify.py` used to do before returning a response.
 */
export function enrichPrediction(name: string, confidence: number): MineralInfo {
  const mineral = MINERALS_BY_NAME[name];
  if (!mineral) return { class: name, confidence };

  return {
    class: name,
    confidence,
    chemical_formula: mineral.chemical_formula,
    hardness: mineral.hardness,
    color: mineral.color,
    luster: mineral.luster,
    crystal_system: mineral.crystal_system,
    density: mineral.density,
    streak: mineral.streak,
    cleavage: mineral.cleavage,
    formation: mineral.formation,
    occurrence: mineral.occurrence,
    uses: mineral.uses,
    description: mineral.description,
  };
}
