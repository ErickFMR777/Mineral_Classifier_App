import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MINERALS as CANONICAL, CATEGORIES } from '../data/minerals';

interface MineralData {
  name: string;
  formula: string;
  hardness: string;
  color: string;
  luster: string;
  crystal: string;
  category: string;
  icon: string;
}

// Projected from data/minerals.json (the single source of truth shared with the
// serverless API) onto the compact shape these cards render.
const MINERALS: MineralData[] = CANONICAL.map((m) => ({
  name: m.name,
  formula: m.formula_display,
  hardness: m.hardness_short,
  color: m.color_short,
  luster: m.luster_short,
  crystal: m.crystal_short,
  category: m.category,
  icon: m.icon,
}));


export const MineralCatalog: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedMineral, setExpandedMineral] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = MINERALS.filter((m) => {
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.formula.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Mineral Catalog
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto">
          Explore the 30 mineral types our AI model can identify. Each mineral includes detailed crystallographic and chemical properties.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search minerals by name, formula, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const count = cat === 'All' ? MINERALS.length : MINERALS.filter(m => m.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of {MINERALS.length} minerals
        </p>
      </div>

      {/* Mineral Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((mineral, index) => (
          <motion.div
            key={mineral.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
            layout
          >
            <div
              onClick={() => setExpandedMineral(expandedMineral === mineral.name ? null : mineral.name)}
              className="group bg-white rounded-2xl border border-gray-200 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mineral.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors">
                        {mineral.name}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{mineral.formula}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-semibold uppercase tracking-wider rounded-md">
                    {mineral.category}
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Hardness</p>
                    <p className="text-sm font-bold text-gray-700">{mineral.hardness}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Crystal</p>
                    <p className="text-sm font-bold text-gray-700">{mineral.crystal}</p>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedMineral === mineral.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-xs text-gray-400 font-medium">Color</span>
                          <span className="text-xs text-gray-700 font-medium text-right max-w-[60%]">{mineral.color}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-xs text-gray-400 font-medium">Luster</span>
                          <span className="text-xs text-gray-700 font-medium">{mineral.luster}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-xs text-gray-400 font-medium">Crystal System</span>
                          <span className="text-xs text-gray-700 font-medium">{mineral.crystal}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No minerals found matching your criteria.</p>
          <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="mt-3 text-violet-600 font-medium text-sm hover:underline">
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
};
