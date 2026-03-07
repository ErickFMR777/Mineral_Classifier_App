import React from 'react';
import { motion } from 'framer-motion';
import { ClassificationResult as IClassificationResult } from '../types';

interface Props {
  result: IClassificationResult;
}

const PropertyCard: React.FC<{ label: string; value: string; icon: React.ReactNode; accent?: string }> = 
  ({ label, value, icon, accent = 'violet' }) => (
  <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors group">
    <div className="flex items-center gap-2 mb-1.5">
      <div className={`w-6 h-6 rounded-md bg-${accent}-100 flex items-center justify-center text-${accent}-600 flex-shrink-0`}>
        {icon}
      </div>
      <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-sm font-semibold text-gray-800 leading-snug pl-8">{value}</p>
  </div>
);

const ListSection: React.FC<{ title: string; items: string[]; icon: React.ReactNode }> = ({ title, items, icon }) => (
  <div className="bg-gray-50 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center text-violet-600">
        {icon}
      </div>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h4>
    </div>
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export const ClassificationResult: React.FC<Props> = ({ result }) => {
  const { primary, alternatives, inference_time_ms } = result;
  const confidencePercent = (primary.confidence * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-md">
              Identified
            </span>
            <span className="text-xs text-gray-400">in {inference_time_ms}ms</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            {primary.class}
          </h2>
          {primary.chemical_formula && (
            <p className="text-lg font-mono text-violet-600 font-bold mt-1">{primary.chemical_formula}</p>
          )}
        </div>

        {/* Confidence Circle */}
        <div className="flex-shrink-0 flex items-center gap-4 sm:gap-0 sm:flex-col sm:items-end">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="34" fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                stroke="url(#confidence-gradient)"
                strokeDasharray={`${2 * Math.PI * 34}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - primary.confidence) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="confidence-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-gray-900">{confidencePercent}%</span>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider sm:mt-1">Confidence</span>
        </div>
      </div>

      {/* ── Description ── */}
      {primary.description && (
        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200/50 rounded-xl p-5">
          <p className="text-sm text-gray-700 leading-relaxed">{primary.description}</p>
        </div>
      )}

      {/* ── Properties Grid ── */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Physical Properties</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {primary.hardness && (
            <PropertyCard label="Hardness (Mohs)" value={primary.hardness} icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>
            } />
          )}
          {primary.crystal_system && (
            <PropertyCard label="Crystal System" value={primary.crystal_system} icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            } />
          )}
          {primary.color && (
            <PropertyCard label="Color" value={primary.color} icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197" /></svg>
            } />
          )}
          {primary.luster && (
            <PropertyCard label="Luster" value={primary.luster} icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            } />
          )}
          {primary.density && (
            <PropertyCard label="Density" value={primary.density} icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75" /></svg>
            } />
          )}
          {primary.streak && (
            <PropertyCard label="Streak" value={primary.streak} icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" /></svg>
            } />
          )}
          {primary.cleavage && (
            <PropertyCard label="Cleavage" value={primary.cleavage} icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" /></svg>
            } />
          )}
        </div>
      </div>

      {/* ── Geology Sections ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {primary.formation && primary.formation.length > 0 && (
          <ListSection title="Formation Process" items={primary.formation} icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>
          } />
        )}
        {primary.occurrence && primary.occurrence.length > 0 && (
          <ListSection title="Where Found" items={primary.occurrence} icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
          } />
        )}
      </div>

      {primary.uses && primary.uses.length > 0 && (
        <ListSection title="Industrial Uses" items={primary.uses} icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.658 3.286m0 0a1.998 1.998 0 01-2.827 0 1.998 1.998 0 010-2.827l3.286-5.658m5.2 5.199L19.5 4.5m0 0a2.121 2.121 0 013 3L15.17 15.17" /></svg>
        } />
      )}

      {/* ── Alternative Matches ── */}
      {alternatives.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Alternative Matches</h3>
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {alternatives.map((alt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-100 transition-colors"
              >
                <span className="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center text-xs font-bold text-gray-500">
                  {i + 1}
                </span>
                <span className="font-semibold text-gray-800 text-sm flex-1">{alt.class}</span>
                <div className="hidden sm:block w-28 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${alt.confidence * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.08 }}
                    className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full"
                  />
                </div>
                <span className="text-sm font-bold text-violet-600 tabular-nums w-14 text-right">
                  {(alt.confidence * 100).toFixed(1)}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
