import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isUsingProbe, onStatus } from '../ml/engine';
import type { EngineStatus } from '../ml/engine';

interface NavigationProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

/**
 * The pill's own states: the engine's four, plus `degraded` — loaded and
 * answering, but without probe.json, so on zero-shot alone. That case reports
 * `ready` from the engine, and showing it as a healthy green "Model ready"
 * would repeat the mistake this pill was written to fix.
 */
type StatusKey = EngineStatus | 'degraded';

/**
 * Wording for the status pill. This used to be a hardcoded "Online" badge,
 * which claimed the model was ready while it was still downloading — or had
 * failed outright. It now reflects the engine's actual state.
 */
const STATUS_LABEL: Record<StatusKey, string> = {
  idle: 'Starting',
  loading: 'Loading model',
  ready: 'Model ready',
  degraded: 'Reduced accuracy',
  error: 'Model unavailable',
};

const STATUS_STYLE: Record<StatusKey, { pill: string; dot: string; text: string }> = {
  idle: { pill: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400', text: 'text-gray-600' },
  loading: { pill: 'bg-violet-50 border-violet-200/80', dot: 'bg-violet-500', text: 'text-violet-700' },
  ready: { pill: 'bg-emerald-50 border-emerald-200/80', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  degraded: { pill: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700' },
  error: { pill: 'bg-red-50 border-red-200', dot: 'bg-red-500', text: 'text-red-700' },
};

function useEngineStatus(): StatusKey {
  const [status, setStatus] = useState<StatusKey>('idle');
  useEffect(
    () => onStatus((s) => setStatus(s === 'ready' && isUsingProbe() === false ? 'degraded' : s)),
    [],
  );
  return status;
}

const navItems = [
  {
    id: 'classifier',
    label: 'Classifier',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'about',
    label: 'About',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
];

export const Navigation: React.FC<NavigationProps> = ({ activeSection, onNavigate }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const engineStatus = useEngineStatus();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('classifier')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold text-gray-900 tracking-tight">
                Mineral<span className="text-violet-600">Classifier</span>
              </span>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center bg-gray-100/80 rounded-xl p-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeSection === item.id
                    ? 'text-violet-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {activeSection === item.id && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm border border-gray-200/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg ${STATUS_STYLE[engineStatus].pill}`}
              title={STATUS_LABEL[engineStatus]}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[engineStatus].dot} ${
                  engineStatus === 'ready' ? '' : 'animate-pulse'
                }`}
              />
              <span className={`text-[11px] font-semibold ${STATUS_STYLE[engineStatus].text}`}>
                {STATUS_LABEL[engineStatus]}
              </span>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                    activeSection === item.id
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              <div className="flex items-center gap-1.5 px-4 py-2 mt-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[engineStatus].dot} ${
                    engineStatus === 'ready' ? '' : 'animate-pulse'
                  }`}
                />
                <span className={`text-[11px] font-semibold ${STATUS_STYLE[engineStatus].text}`}>
                  {STATUS_LABEL[engineStatus]}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
