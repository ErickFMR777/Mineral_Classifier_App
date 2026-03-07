import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getModelMetrics } from '../api/client';
import type { ModelMetrics, PerClassMetric } from '../types';

type MetricsTab = 'overview' | 'per-class' | 'confusion';

export const AboutSection: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsTab, setMetricsTab] = useState<MetricsTab>('overview');

  useEffect(() => {
    getModelMetrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!metrics) return [];
    const m = metrics.model_info;
    return [
      { label: 'Mineral Classes', value: String(m.total_classes), icon: '💎' },
      { label: 'Model', value: 'CLIP ViT-B/32', icon: '🧠' },
      { label: 'Embedding Dim', value: String(m.embedding_dim), icon: '⚙️' },
      { label: 'Test Accuracy', value: `${(metrics.overall_metrics.accuracy * 100).toFixed(1)}%`, icon: '🎯' },
    ];
  }, [metrics]);

  const features = [
    {
      title: 'CLIP Vision Embeddings',
      description: 'Uses OpenAI\'s CLIP ViT-B/32 to extract rich 512-dimensional visual embeddings, capturing both texture and semantic features of mineral specimens.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      title: 'Comprehensive Mineral Database',
      description: 'Each classification returns 14+ properties including chemical formula, Mohs hardness, crystal system, density, streak, luster, formation processes, geological occurrence, and industrial uses.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      ),
    },
    {
      title: 'Real-time Inference',
      description: 'Optimized for CPU execution with inference times typically under 2 seconds. The model runs directly on the server without requiring GPU acceleration, making it accessible on any deployment.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
    },
    {
      title: 'Top-5 Alternative Matches',
      description: 'Beyond the primary classification, the system provides the 5 most likely alternative mineral identifications with probability scores, helping users verify ambiguous specimens.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      ),
    },
  ];

  const techStack = [
    { name: 'React 18', role: 'Frontend Framework', color: 'bg-sky-100 text-sky-700' },
    { name: 'TypeScript', role: 'Type Safety', color: 'bg-blue-100 text-blue-700' },
    { name: 'Tailwind CSS', role: 'Styling', color: 'bg-teal-100 text-teal-700' },
    { name: 'FastAPI', role: 'Backend API', color: 'bg-emerald-100 text-emerald-700' },
    { name: 'CLIP ViT-B/32', role: 'Vision Model', color: 'bg-orange-100 text-orange-700' },
    { name: 'Scikit-learn', role: 'Classifier Head', color: 'bg-violet-100 text-violet-700' },
    { name: 'Framer Motion', role: 'Animations', color: 'bg-pink-100 text-pink-700' },
    { name: 'Pillow', role: 'Image Processing', color: 'bg-amber-100 text-amber-700' },
  ];

  // Color interpolation for confusion matrix heatmap
  const getHeatColor = (value: number, max: number) => {
    if (value === 0) return 'rgb(249, 250, 251)';
    const ratio = value / max;
    if (ratio < 0.25) return `rgba(139, 92, 246, ${0.1 + ratio * 0.4})`;
    if (ratio < 0.5) return `rgba(139, 92, 246, ${0.2 + ratio * 0.5})`;
    if (ratio < 0.75) return `rgba(124, 58, 237, ${0.4 + ratio * 0.4})`;
    return `rgba(109, 40, 217, ${0.7 + ratio * 0.3})`;
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const sortedPerClass = useMemo(() => {
    if (!metrics) return [];
    return [...metrics.per_class_metrics].sort((a, b) => b.f1 - a.f1);
  }, [metrics]);

  const matrixMax = useMemo(() => {
    if (!metrics) return 1;
    return Math.max(...metrics.confusion_matrix.matrix.flat());
  }, [metrics]);

  const renderMetricsOverview = () => {
    if (!metrics) return null;
    const om = metrics.overall_metrics;
    const mi = metrics.model_info;

    const overallCards = [
      { label: 'Accuracy', value: pct(om.accuracy), desc: 'Overall' },
      { label: 'Precision', value: pct(om.weighted_precision), desc: 'Weighted' },
      { label: 'Recall', value: pct(om.weighted_recall), desc: 'Weighted' },
      { label: 'F1-Score', value: pct(om.weighted_f1), desc: 'Weighted' },
    ];

    const macroCards = [
      { label: 'Macro Precision', value: pct(om.macro_precision) },
      { label: 'Macro Recall', value: pct(om.macro_recall) },
      { label: 'Macro F1', value: pct(om.macro_f1) },
    ];

    return (
      <div className="space-y-6">
        {/* Model Architecture Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h5 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-violet-500 rounded-full" />
              Model Architecture
            </h5>
            <dl className="space-y-2 text-sm">
              {[
                ['Base Model', mi.base_model],
                ['Classifier', mi.classifier_head],
                ['Embedding Dim', `${mi.embedding_dim}`],
                ['Trained Classes', `${mi.trained_classes}`],
                ['Zero-shot Classes', `${mi.zero_shot_classes.length} (${mi.zero_shot_classes.join(', ')})`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="text-gray-900 font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h5 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-fuchsia-500 rounded-full" />
              Training Data
            </h5>
            <dl className="space-y-2 text-sm">
              {[
                ['Dataset', mi.training_dataset],
                ['Training Samples', mi.training_samples.toLocaleString()],
                ['Validation Samples', mi.validation_samples.toLocaleString()],
                ['Test Samples', mi.test_samples.toLocaleString()],
                ['Total', (mi.training_samples + mi.validation_samples + mi.test_samples).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="text-gray-900 font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Overall Metrics Cards */}
        <div>
          <h5 className="font-semibold text-gray-900 text-sm mb-3">Weighted Metrics (Test Set)</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {overallCards.map((c) => (
              <div key={c.label} className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-violet-700">{c.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Macro Metrics */}
        <div>
          <h5 className="font-semibold text-gray-900 text-sm mb-3">Macro Metrics (unweighted average)</h5>
          <div className="grid grid-cols-3 gap-3">
            {macroCards.map((c) => (
              <div key={c.label} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getF1Color = (f1: number) => {
    if (f1 >= 0.8) return 'text-emerald-600';
    if (f1 >= 0.6) return 'text-amber-600';
    return 'text-red-500';
  };

  const getF1Bg = (f1: number) => {
    if (f1 >= 0.8) return 'bg-emerald-500';
    if (f1 >= 0.6) return 'bg-amber-500';
    return 'bg-red-400';
  };

  const renderPerClass = () => {
    if (!metrics) return null;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Mineral</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Precision</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Recall</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">F1-Score</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Support</th>
              <th className="py-2 px-3 text-gray-500 font-medium w-32">F1 Bar</th>
            </tr>
          </thead>
          <tbody>
            {sortedPerClass.map((c: PerClassMetric, i: number) => (
              <tr key={c.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-3 font-medium text-gray-900">{c.name}</td>
                <td className="py-2 px-3 text-right text-gray-700">{pct(c.precision)}</td>
                <td className="py-2 px-3 text-right text-gray-700">{pct(c.recall)}</td>
                <td className={`py-2 px-3 text-right font-bold ${getF1Color(c.f1)}`}>{pct(c.f1)}</td>
                <td className="py-2 px-3 text-right text-gray-500">{c.support}</td>
                <td className="py-2 px-3">
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.f1 * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.03 }}
                      className={`h-full rounded-full ${getF1Bg(c.f1)}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderConfusionMatrix = () => {
    if (!metrics) return null;
    const { labels, matrix } = metrics.confusion_matrix;

    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Rows represent the true class, columns represent the predicted class. Darker cells indicate more samples. Diagonal values = correct predictions.
        </p>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="p-1 text-gray-400 font-normal sticky left-0 bg-white z-10" />
                  {labels.map((l) => (
                    <th key={l} className="p-1 font-normal text-gray-500 min-w-[28px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, ri) => (
                  <tr key={labels[ri]}>
                    <td className="p-1 pr-2 text-right text-gray-700 font-medium whitespace-nowrap sticky left-0 bg-white z-10">
                      {labels[ri]}
                    </td>
                    {row.map((val, ci) => (
                      <td
                        key={ci}
                        className={`p-0.5 text-center border border-white/50 ${ri === ci ? 'font-bold' : ''}`}
                        style={{
                          backgroundColor: getHeatColor(val, matrixMax),
                          color: val / matrixMax > 0.5 ? 'white' : val === 0 ? '#d1d5db' : '#374151',
                          minWidth: '28px',
                          height: '28px',
                        }}
                        title={`True: ${labels[ri]}, Pred: ${labels[ci]}, Count: ${val}`}
                      >
                        {val > 0 ? val : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex gap-0.5">
            {[0, 0.15, 0.3, 0.5, 0.75, 1].map((r) => (
              <div
                key={r}
                className="w-5 h-3 rounded-sm"
                style={{ backgroundColor: getHeatColor(r * matrixMax || 1, matrixMax) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    );
  };

  const tabs: { id: MetricsTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'General', icon: '📊' },
    { id: 'per-class', label: 'Per Class', icon: '📋' },
    { id: 'confusion', label: 'Confusion Matrix', icon: '🔥' },
  ];

  return (
    <section className="space-y-12">
      {/* Hero */}
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          About MineralClassifier
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          An AI-powered geological tool that identifies minerals from photographs using state-of-the-art deep learning. Built for geologists, educators, students, and mineral enthusiasts.
        </p>
      </div>

      {/* Stats Grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 text-center hover:shadow-lg hover:border-violet-200 transition-all"
            >
              <span className="text-2xl mb-2 block">{stat.icon}</span>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">How It Works</h3>
        <p className="text-sm text-gray-500 mb-8">From photo upload to mineral identification in three steps</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Upload Image', desc: 'Drag and drop or click to upload a photo of your mineral specimen. Supports JPG, PNG, and WebP formats up to 5MB.', color: 'from-violet-500 to-purple-600' },
            { step: '02', title: 'AI Analysis', desc: 'CLIP ViT-B/32 extracts a 512-dimensional embedding from the image. A linear classifier (Logistic Regression) maps it to one of 30 mineral classes.', color: 'from-fuchsia-500 to-pink-600' },
            { step: '03', title: 'Get Results', desc: 'Receive the mineral classification with confidence score, chemical formula, physical properties, formation geology, and 5 alternative matches ranked by probability.', color: 'from-rose-500 to-red-600' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              className="relative"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white text-sm font-bold mb-4 shadow-lg`}>
                {item.step}
              </div>
              <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-violet-200 transition-all"
            >
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 mb-4">
                {feature.icon}
              </div>
              <h4 className="font-bold text-gray-900 mb-2">{feature.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Model Performance & Metrics - Dynamic */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Model Performance & Metrics</h3>
        <p className="text-sm text-gray-500 mb-6">
          Real evaluation metrics computed on the test set ({metrics?.model_info.test_samples.toLocaleString() ?? '...'} samples).
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
            <span className="ml-3 text-gray-500 text-sm">Loading metrics...</span>
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMetricsTab(tab.id)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    metricsTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-1.5">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <motion.div
              key={metricsTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {metricsTab === 'overview' && renderMetricsOverview()}
              {metricsTab === 'per-class' && renderPerClass()}
              {metricsTab === 'confusion' && renderConfusionMatrix()}
            </motion.div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-8 text-center">Could not load model metrics.</p>
        )}

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Important Notice</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                This tool is designed for educational and reference purposes. Accuracy may vary depending on image quality, lighting, angle, and specimen preparation. For critical geological identification, always consult a qualified geologist or use laboratory-grade analytical techniques (XRD, thin section analysis, etc.).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Technology Stack</h3>
        <p className="text-sm text-gray-500 mb-6">Built with modern, production-ready technologies</p>

        <div className="flex flex-wrap gap-3">
          {techStack.map((tech) => (
            <div key={tech.name} className={`px-4 py-2.5 rounded-xl ${tech.color} font-medium text-sm`}>
              <span className="font-bold">{tech.name}</span>
              <span className="opacity-70 ml-1.5">· {tech.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Target Users */}
      <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Who Is This For?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Geologists & Researchers', desc: 'Quick field identification and preliminary mineral screening.', emoji: '🔬' },
            { title: 'Students & Educators', desc: 'Interactive learning tool for mineralogy and geology courses.', emoji: '🎓' },
            { title: 'Mineral Collectors', desc: 'Identify specimens in your collection with detailed properties.', emoji: '💎' },
            { title: 'Museum Curators', desc: 'Catalog and verify mineral specimens for exhibitions.', emoji: '🏛️' },
            { title: 'Field Workers', desc: 'On-site mineral identification without specialized equipment.', emoji: '⛏️' },
            { title: 'General Public', desc: 'Satisfy your curiosity about rocks and minerals you find.', emoji: '🌍' },
          ].map((user) => (
            <div key={user.title} className="flex items-start gap-3 bg-white/60 rounded-xl p-4">
              <span className="text-xl flex-shrink-0">{user.emoji}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{user.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{user.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Info */}
      <div className="bg-gray-900 rounded-2xl p-8 text-white">
        <h3 className="text-xl font-bold mb-2">REST API</h3>
        <p className="text-gray-400 text-sm mb-6">The classification engine is accessible via a RESTful API for integration into your own applications.</p>

        <div className="space-y-3 font-mono text-sm">
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">POST</span>
            <span className="text-gray-300">/api/classify/mineral</span>
            <span className="ml-auto text-gray-500 text-xs font-sans">Upload & classify image</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
            <span className="text-gray-300">/api/reference/minerals</span>
            <span className="ml-auto text-gray-500 text-xs font-sans">List all 30 minerals</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
            <span className="text-gray-300">/api/reference/minerals/{'{name}'}</span>
            <span className="ml-auto text-gray-500 text-xs font-sans">Mineral details</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
            <span className="text-gray-300">/api/model-metrics</span>
            <span className="ml-auto text-gray-500 text-xs font-sans">Model metrics & confusion matrix</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
            <span className="text-gray-300">/api/health</span>
            <span className="ml-auto text-gray-500 text-xs font-sans">Health check</span>
          </div>
        </div>

        <p className="mt-6 text-gray-400 text-xs">
          Interactive documentation available at <span className="text-violet-400 font-semibold">/docs</span> (Swagger UI)
        </p>
      </div>
    </section>
  );
};
