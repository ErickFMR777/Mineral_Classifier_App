import React, { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { UploadZone } from './components/UploadZone'
import { ClassificationResult } from './components/ClassificationResult'
import { LoadingSpinner } from './components/LoadingSpinner'
import { Navigation } from './components/Navigation'
import { MineralCatalog } from './components/MineralCatalog'
import { AboutSection } from './components/AboutSection'
import { ModelStatusBar } from './components/ModelStatusBar'
import { classifyMineral } from './api/client'
import { isUsingProbe, onProgress, onStatus, preloadModel } from './ml/engine'
import type { EngineStatus, ModelLoadProgress } from './ml/engine'
import { ClassificationResult as IClassificationResult } from './types'
import './styles/globals.css'

function App() {
  const [image, setImage] = useState<File | null>(null)
  const [result, setResult] = useState<IClassificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('classifier')
  const [modelStatus, setModelStatus] = useState<EngineStatus>('idle')
  const [modelProgress, setModelProgress] = useState<ModelLoadProgress | null>(null)
  const [usingProbe, setUsingProbe] = useState<boolean | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  // Start pulling the CLIP weights immediately so the download overlaps with
  // the user picking a photo instead of stalling the first classification.
  useEffect(() => {
    const offProgress = onProgress(setModelProgress)
    const offStatus = onStatus((status) => {
      setModelStatus(status)
      setUsingProbe(isUsingProbe())
    })
    preloadModel()
    return () => {
      offProgress()
      offStatus()
    }
  }, [])

  const handleImageSelected = (file: File) => {
    setImage(file)
    setError(null)
    setResult(null)
  }

  const handleClassify = async () => {
    if (!image) return

    setLoading(true)
    setError(null)

    try {
      const classificationResult = await classifyMineral(image)
      setResult(classificationResult)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Classification failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (section: string) => {
    setActiveSection(section)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Main Content */}
      <main ref={mainRef} className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {/* ==================== CLASSIFIER ==================== */}
            {activeSection === 'classifier' && (
              <motion.div
                key="classifier"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Hero Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-8 sm:p-12 text-white">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
                  </div>

                  <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-medium mb-6">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      CLIP ViT-B/32 · 30 Mineral Classes · Runs in your browser
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
                      AI Mineral<br />Identification
                    </h1>
                    <p className="text-violet-100 text-lg leading-relaxed max-w-xl">
                      Upload a photo of any mineral specimen and get instant classification with chemical formula, Mohs hardness, crystal system, and geological properties.
                    </p>
                  </div>
                </div>

                {/* Upload Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 sm:p-8 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.414-1.414a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">Upload Specimen Image</h2>
                    </div>
                    <p className="text-sm text-gray-500 ml-11">Drag & drop or click to select a mineral photo for classification</p>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    <ModelStatusBar status={modelStatus} progress={modelProgress} usingProbe={usingProbe} />

                    <UploadZone
                      onImageSelected={handleImageSelected}
                      isLoading={loading}
                    />

                    {image && (
                      <div>
                        <button
                          onClick={handleClassify}
                          disabled={loading}
                          className={`
                            w-full py-4 rounded-xl font-bold text-base transition-all duration-300
                            flex items-center justify-center gap-2
                            ${loading
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300'
                            }
                          `}
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Analyzing Specimen...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              Classify Mineral
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Loading */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
                  >
                    <LoadingSpinner />
                  </motion.div>
                )}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-red-800">Classification Error</p>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Results */}
                {result && !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8"
                  >
                    <ClassificationResult result={result} />
                  </motion.div>
                )}

                {/* Quick Info Cards (when no result) */}
                {!result && !loading && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-violet-200 transition-all">
                      <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.006.001A48.309 48.309 0 0112 21a48.25 48.25 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">30 Minerals</h3>
                      <p className="text-sm text-gray-500">From common quartz to rare corundum, covering silicates, oxides, carbonates, and more.</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-violet-200 transition-all">
                      <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">Private by Design</h3>
                      <p className="text-sm text-gray-500">Inference runs on your own device. Photos are never uploaded, and the app works offline once the model is cached.</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-violet-200 transition-all">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">Rich Properties</h3>
                      <p className="text-sm text-gray-500">Chemical formula, hardness, crystal system, geological formation, and industrial uses.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ==================== CATALOG ==================== */}
            {activeSection === 'catalog' && (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <MineralCatalog />
              </motion.div>
            )}

            {/* ==================== ABOUT ==================== */}
            {activeSection === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <AboutSection />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">MineralClassifier</span>
              <span className="text-xs text-gray-400">v1.0.0</span>
            </div>

            <div className="flex items-center gap-6 text-xs text-gray-400">
              <span>30 Mineral Types</span>
              <span className="hidden sm:inline">·</span>
              <span>React + TypeScript + ONNX Runtime</span>
              <span className="hidden sm:inline">·</span>
              <span>CLIP ViT-B/32</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
