import React from 'react';
import { motion } from 'framer-motion';
import type { EngineStatus, ModelLoadProgress } from '../ml/engine';

interface Props {
  status: EngineStatus;
  progress: ModelLoadProgress | null;
}

const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

/**
 * Surfaces the one-off model download. The weights are ~84 MB and are cached by
 * the browser afterwards, so being explicit about what is happening (and that
 * it only happens once) matters a lot more than hiding it behind a spinner.
 */
export const ModelStatusBar: React.FC<Props> = ({ status, progress }) => {
  if (status === 'error') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-800">Could not load the AI model</p>
          <p className="mt-0.5 text-xs text-red-600">
            Check your connection and reload the page. The model is downloaded from the
            Hugging Face CDN on first use.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <p className="text-xs font-medium text-emerald-800">
          Model ready · runs entirely on your device — your photos are never uploaded
        </p>
      </div>
    );
  }

  const ratio = progress?.ratio ?? null;
  const percent = ratio === null ? null : Math.round(ratio * 100);

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <svg className="h-4 w-4 flex-shrink-0 animate-spin text-violet-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="truncate text-xs font-semibold text-violet-900">
            Downloading the CLIP model — one time only, then cached
          </p>
        </div>
        {percent !== null && (
          <span className="flex-shrink-0 text-xs font-bold tabular-nums text-violet-700">{percent}%</span>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-200">
        {percent === null ? (
          <motion.div
            className="h-full w-1/3 rounded-full bg-violet-500"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>

      {progress && progress.totalBytes > 0 && (
        <p className="mt-1.5 text-[11px] text-violet-600">
          {formatMB(progress.loadedBytes)} of {formatMB(progress.totalBytes)}
        </p>
      )}
    </div>
  );
};
