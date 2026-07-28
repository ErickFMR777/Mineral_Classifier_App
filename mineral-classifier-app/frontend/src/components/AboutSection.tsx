import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getModelMetrics } from '../api/client';
import type { ModelMetrics, PerClassMetric } from '../types';

type MetricsTab = 'overview' | 'per-class' | 'confusion' | 'limitations';

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
    const totalImages = m.training_samples + m.validation_samples + m.test_samples;
    return [
      { label: 'Mineral Classes', value: String(m.total_classes), icon: '💎' },
      { label: 'Trained Classes', value: `${m.trained_classes} / ${m.total_classes}`, icon: '🧠' },
      { label: 'Training Images', value: totalImages.toLocaleString(), icon: '🗂️' },
      { label: 'Top-1 Accuracy', value: `${(metrics.overall_metrics.accuracy * 100).toFixed(1)}%`, icon: '🎯' },
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
      title: 'On-Device Inference',
      description: 'The model is compiled to ONNX and executed in your browser through WebAssembly. Photos never leave your device, there is no inference server to pay for, and everything keeps working offline once the weights are cached.',
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
    { name: 'Transformers.js', role: 'In-Browser ML', color: 'bg-amber-100 text-amber-700' },
    { name: 'ONNX Runtime', role: 'WASM Inference', color: 'bg-emerald-100 text-emerald-700' },
    { name: 'CLIP ViT-B/32', role: 'Vision Model', color: 'bg-orange-100 text-orange-700' },
    { name: 'Web Workers', role: 'Off-Thread Compute', color: 'bg-violet-100 text-violet-700' },
    { name: 'Framer Motion', role: 'Animations', color: 'bg-pink-100 text-pink-700' },
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

  const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);

  // Zero-shot classes have no test samples and therefore no F1; they sort last.
  const sortedPerClass = useMemo(() => {
    if (!metrics) return [];
    return [...metrics.per_class_metrics].sort((a, b) => {
      if (a.f1 === null && b.f1 === null) return a.name.localeCompare(b.name);
      if (a.f1 === null) return 1;
      if (b.f1 === null) return -1;
      return b.f1 - a.f1;
    });
  }, [metrics]);

  const matrixMax = useMemo(() => {
    if (!metrics) return 1;
    return Math.max(...metrics.confusion_matrix.matrix.flat());
  }, [metrics]);

  const renderMetricsOverview = () => {
    if (!metrics) return null;
    const om = metrics.overall_metrics;
    const mi = metrics.model_info;

    const headlineCards = [
      { label: 'Top-1 Accuracy', value: pct(om.accuracy), desc: 'Exact match' },
      om.top3_accuracy !== undefined && {
        label: 'Top-3 Accuracy', value: pct(om.top3_accuracy), desc: 'Correct answer in top 3',
      },
      om.top5_accuracy !== undefined && {
        label: 'Top-5 Accuracy', value: pct(om.top5_accuracy), desc: 'Correct answer in top 5',
      },
      om.balanced_accuracy !== undefined && {
        label: 'Balanced Accuracy', value: pct(om.balanced_accuracy), desc: 'Mean per-class recall',
      },
    ].filter(Boolean) as { label: string; value: string; desc: string }[];

    const weightedCards = [
      { label: 'Weighted Precision', value: pct(om.weighted_precision) },
      { label: 'Weighted Recall', value: pct(om.weighted_recall) },
      { label: 'Weighted F1', value: pct(om.weighted_f1) },
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

        {/* Headline accuracies */}
        <div>
          <h5 className="font-semibold text-gray-900 text-sm mb-3">Accuracy on the held-out test set</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {headlineCards.map((c) => (
              <div key={c.label} className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-violet-700">{c.value}</p>
                <p className="text-xs text-gray-600 font-semibold mt-1">{c.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
          {om.balanced_accuracy !== undefined && (
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
              Balanced accuracy averages recall over classes instead of over samples, so a
              well-represented mineral cannot mask a poorly-represented one. The gap between it and
              top-1 accuracy is a direct measure of how uneven the training data is.
            </p>
          )}
        </div>

        {/* Weighted vs macro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-semibold text-gray-900 text-sm mb-3">
              Weighted <span className="font-normal text-gray-400">· by class frequency</span>
            </h5>
            <div className="space-y-2">
              {weightedCards.map((c) => (
                <div key={c.label} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <span className="text-xs text-gray-500 font-medium">{c.label}</span>
                  <span className="text-lg font-bold text-gray-900 tabular-nums">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 text-sm mb-3">
              Macro <span className="font-normal text-gray-400">· every class counts equally</span>
            </h5>
            <div className="space-y-2">
              {macroCards.map((c) => (
                <div key={c.label} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <span className="text-xs text-gray-500 font-medium">{c.label}</span>
                  <span className="text-lg font-bold text-gray-900 tabular-nums">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Reading these:</span> precision answers
            &ldquo;when the model said <em>Pyrite</em>, how often was it right?&rdquo;; recall answers
            &ldquo;of all the actual <em>Pyrite</em> specimens, how many did it find?&rdquo;; F1 is
            their harmonic mean. Macro scores sit below weighted scores whenever the rare classes are
            the weak ones — which is exactly the case here.
          </p>
        </div>
      </div>
    );
  };

  const getF1Color = (f1: number | null) => {
    if (f1 === null) return 'text-gray-300';
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
    // A legacy metrics payload carries neither the threshold nor train counts;
    // the table then simply renders without the scarcity highlighting.
    const scarceThreshold = metrics.dataset_balance?.scarce_threshold ?? 0;
    const hasTrainCounts = metrics.per_class_metrics.some((c) => c.train_support !== undefined);

    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Sorted by F1.{' '}
          {hasTrainCounts && (
            <>
              <span className="font-semibold text-gray-700">Train</span> is how many labelled images
              the class was fitted on — the single strongest predictor of how well it scores. Rows
              tinted amber were trained on fewer than {scarceThreshold} images; rows in grey have no
              training data at all and fall back to zero-shot CLIP.
            </>
          )}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Mineral</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Precision</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Recall</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">F1-Score</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Train</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Test</th>
                <th className="py-2 px-3 text-gray-500 font-medium w-32">F1 Bar</th>
              </tr>
            </thead>
            <tbody>
              {sortedPerClass.map((c: PerClassMetric, i: number) => {
                // Absent `trained` means a legacy payload: assume trained.
                const isTrained = c.trained ?? true;
                const trainSupport = c.train_support ?? 0;
                const scarce = isTrained && trainSupport > 0 && trainSupport < scarceThreshold;
                const rowClass = !isTrained
                  ? 'bg-gray-100/70'
                  : scarce
                    ? 'bg-amber-50'
                    : i % 2 === 0
                      ? 'bg-white'
                      : 'bg-gray-50';

                return (
                  <tr key={c.name} className={rowClass}>
                    <td className="py-2 px-3 font-medium text-gray-900 whitespace-nowrap">
                      {c.name}
                      {!isTrained && (
                        <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[9px] font-bold uppercase tracking-wider rounded">
                          zero-shot
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700 tabular-nums">{pct(c.precision)}</td>
                    <td className="py-2 px-3 text-right text-gray-700 tabular-nums">{pct(c.recall)}</td>
                    <td className={`py-2 px-3 text-right font-bold tabular-nums ${getF1Color(c.f1)}`}>
                      {pct(c.f1)}
                    </td>
                    <td className={`py-2 px-3 text-right tabular-nums ${scarce ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                      {trainSupport || '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-500 tabular-nums">
                      {c.support || '—'}
                    </td>
                    <td className="py-2 px-3">
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        {c.f1 !== null && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${c.f1 * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.03 }}
                            className={`h-full rounded-full ${getF1Bg(c.f1)}`}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderConfusionMatrix = () => {
    if (!metrics) return null;
    const { labels, matrix } = metrics.confusion_matrix;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            Rows are the true mineral, columns are what the model predicted. The diagonal is
            correct predictions; everything off it is a mistake. Darker cells hold more specimens.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Why the diagonal is uneven:</span> row
            brightness tracks how many test specimens a class has, which in turn tracks how many
            training images it had. Sparse rows are the classes the dataset barely covers, so their
            row is both faint and more scattered.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">The errors are not random.</span> Two
            patterns dominate. First, minerals get pulled toward whichever class has the most
            training images: colourless and pale specimens drift into Quartz (a third of misread
            Calcite and Fluorite land there), and prismatic ones drift into Feldspar. That is the
            class imbalance expressing itself directly. Second, genuinely look-alike pairs swap with
            each other — the two dark iron oxides Magnetite and Hematite, and the two dark chain
            silicates Amphibole and Pyroxene — which is the expected failure mode for a model that
            only ever sees colour, texture and shape.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Only the {metrics.model_info.trained_classes} trained classes appear here. The{' '}
            {metrics.model_info.zero_shot_classes.length} zero-shot classes have no test specimens
            to score.
          </p>
        </div>
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

  const renderLimitations = () => {
    if (!metrics) return null;
    const mi = metrics.model_info;
    const db = metrics.dataset_balance;
    const totalSamples = mi.training_samples + mi.validation_samples + mi.test_samples;

    const items: { title: string; body: React.ReactNode; tone: 'amber' | 'red' | 'gray' }[] = [
      {
        tone: 'amber',
        title: 'The dataset is small',
        body: (
          <>
            The probe was fitted on {totalSamples.toLocaleString()} labelled photographs across{' '}
            {mi.trained_classes} classes — a few hundred per class on average, where image models are
            normally trained on hundreds of thousands. That is precisely why the CLIP encoder is kept
            frozen and only a linear layer is learned on top: with this little data, fine-tuning the
            whole network would memorise it rather than generalise.
          </>
        ),
      },
      ...(db
        ? [
            {
              tone: 'amber' as const,
              title: 'The classes are very unevenly represented',
              body: (
                <>
                  The best-covered mineral has {db.max_train_samples.toLocaleString()} training
                  images, the thinnest has just {db.min_train_samples} — an imbalance of roughly{' '}
                  {db.imbalance_ratio}:1, with a median of {db.median_train_samples}. Classes below{' '}
                  {db.scarce_threshold} images
                  {db.scarce_classes.length > 0 && <> — {db.scarce_classes.join(', ')} — </>}
                  are the ones you will find at the bottom of the per-class table, and they are also
                  the faint, scattered rows in the confusion matrix. Their scores reflect a shortage
                  of examples, not something intrinsically harder about the mineral.
                </>
              ),
            },
          ]
        : []),
      {
        tone: 'red',
        title: `${mi.zero_shot_classes.length} classes have no training data at all`,
        body: (
          <>
            {mi.zero_shot_classes.join(', ')} are absent from the source dataset entirely. They are
            still offered as possible answers, but scored only by zero-shot CLIP — comparing the
            photo against a written description of the mineral. That is markedly less reliable than
            the trained path, it carries no measured precision or recall, and predictions naming
            these minerals deserve real scepticism.
          </>
        ),
      },
      {
        tone: 'gray',
        title: 'Five of the classes are mineral groups, not single minerals',
        body: (
          <>
            Feldspar, Mica, Amphibole, Pyroxene and Garnet each aggregate several distinct species
            (microcline, albite and labradorite all become &ldquo;Feldspar&rdquo;, for instance).
            Those classes are therefore visually heterogeneous by construction, which caps how sharp
            their decision boundary can be and explains part of their lower F1.
          </>
        ),
      },
      {
        tone: 'gray',
        title: 'A photograph is missing most diagnostic evidence',
        body: (
          <>
            Mineral identification normally relies on hardness, streak, density, cleavage angles,
            magnetism, reaction to acid and UV fluorescence. The model sees none of that — only
            colour, texture and shape. Minerals that are separated mainly by those physical tests
            (pyrite against marcasite, calcite against dolomite) are effectively indistinguishable
            here, and scale is ambiguous without a reference object in frame.
          </>
        ),
      },
      {
        tone: 'gray',
        title: 'Benchmark conditions are kinder than the field',
        body: (
          <>
            The training images are studio photographs of curated, cleaned specimens on plain
            backgrounds. Field photos — weathered surfaces, mineral still in its matrix, mixed
            lighting, several minerals in one frame — sit outside that distribution, so expect real
            accuracy to land below the numbers above. Those numbers come from a held-out split of
            the same dataset and measure performance on that dataset, not in the field.
          </>
        ),
      },
    ];

    const toneClass = {
      amber: 'border-amber-200 bg-amber-50',
      red: 'border-red-200 bg-red-50',
      gray: 'border-gray-200 bg-gray-50',
    };
    const titleClass = {
      amber: 'text-amber-900',
      red: 'text-red-900',
      gray: 'text-gray-900',
    };
    const bodyClass = {
      amber: 'text-amber-800',
      red: 'text-red-800',
      gray: 'text-gray-600',
    };

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          What the numbers on the other tabs do and do not mean. These are the honest constraints of
          the data behind this model.
        </p>
        {items.map((item) => (
          <div key={item.title} className={`rounded-xl border p-5 ${toneClass[item.tone]}`}>
            <h5 className={`text-sm font-bold mb-1.5 ${titleClass[item.tone]}`}>{item.title}</h5>
            <p className={`text-xs leading-relaxed ${bodyClass[item.tone]}`}>{item.body}</p>
          </div>
        ))}
      </div>
    );
  };

  const tabs: { id: MetricsTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'General', icon: '📊' },
    { id: 'per-class', label: 'Per Class', icon: '📋' },
    { id: 'confusion', label: 'Confusion Matrix', icon: '🔥' },
    { id: 'limitations', label: 'Limitations', icon: '⚠️' },
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
            { step: '02', title: 'AI Analysis', desc: 'CLIP ViT-B/32 runs in a Web Worker and extracts a 512-dimensional embedding, averaged over four test-time augmentations. The embedding is then scored against all 30 mineral classes.', color: 'from-fuchsia-500 to-pink-600' },
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
            {/* Four tabs no longer fit side by side on a phone, so they wrap. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-gray-100 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMetricsTab(tab.id)}
                  className={`py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
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
              {metricsTab === 'limitations' && renderLimitations()}
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
              <p className="text-sm font-semibold text-amber-800">Educational tool, not an assay</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Treat every prediction as a hypothesis to check, never as an identification. Accuracy
                varies with image quality, lighting, angle and specimen preparation, and the{' '}
                <button
                  onClick={() => setMetricsTab('limitations')}
                  className="font-semibold underline underline-offset-2 hover:text-amber-900"
                >
                  Limitations tab
                </button>{' '}
                lists the specific cases where it is weakest. For anything that matters, confirm with
                a qualified geologist or laboratory analysis (XRD, thin section, SEM-EDS).
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
        <p className="text-gray-400 text-sm mb-6">
          The mineral reference data is served by serverless functions and is free to consume from your own
          applications. Classification itself is not an endpoint — it runs locally in your browser.
        </p>

        <div className="space-y-3 font-mono text-sm">
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
          All endpoints are public, CORS-enabled and cached at the edge.
        </p>
      </div>
    </section>
  );
};
