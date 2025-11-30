/**
 * Browser-based summarization utilities
 * Supports Chrome Summarizer API (Gemini Nano) and WebLLM fallback
 */

export type SummaryType = 'key-points' | 'tl;dr' | 'teaser' | 'headline'

export type SummarizationMethod = 'chrome-api' | 'webllm' | 'unsupported'

/**
 * Detect which summarization method is available
 */
export async function detectSummarizationMethod(): Promise<SummarizationMethod> {
  // Check for Chrome Summarizer API (Chrome 128+)
  if (typeof window !== 'undefined' && 'ai' in window) {
    const ai = (window as never)['ai'] as { summarizer?: { capabilities?: () => Promise<{ available: string }> } }
    if (ai.summarizer?.capabilities) {
      try {
        const capabilities = await ai.summarizer.capabilities()
        if (capabilities.available === 'readily' || capabilities.available === 'after-download') {
          return 'chrome-api'
        }
      } catch (error) {
        console.warn('Chrome Summarizer API check failed:', error)
      }
    }
  }

  // Check for WebGPU support (required for WebLLM)
  if (typeof window !== 'undefined' && 'gpu' in navigator) {
    return 'webllm'
  }

  return 'unsupported'
}

/**
 * Summarize text using Chrome Summarizer API
 */
export async function summarizeWithChromeAPI(
  text: string,
  type: SummaryType = 'key-points',
  onProgress?: (progress: number) => void,
  customPrompt?: string
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Chrome Summarizer API is only available in the browser')
  }

  const ai = (window as never)['ai'] as {
    summarizer?: {
      create: (options: { type: string; length: string }) => Promise<{
        summarize: (text: string) => Promise<string>
        destroy: () => void
      }>
    }
  }

  if (!ai.summarizer) {
    throw new Error('Chrome Summarizer API is not available')
  }

  try {
    onProgress?.(10)

    const summarizer = await ai.summarizer.create({
      type,
      length: 'medium',
    })

    onProgress?.(50)

    const summary = await summarizer.summarize(text)

    onProgress?.(90)

    // Clean up
    summarizer.destroy()

    onProgress?.(100)

    return summary
  } catch (error) {
    console.error('Chrome Summarizer API error:', error)
    throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Summarize text using WebLLM (fallback for non-Chrome browsers)
 */
export async function summarizeWithWebLLM(
  text: string,
  _type: SummaryType = 'key-points',
  onProgress?: (progress: number, status?: string) => void,
  customPrompt?: string
): Promise<string> {
  // Dynamic import to avoid loading WebLLM in Chrome
  const { CreateMLCEngine } = await import('@mlc-ai/web-llm')

  onProgress?.(10, 'Initialiseren van model...')

  // Use a small, efficient model
  const selectedModel = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

  try {
    const engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (report) => {
        const progress = Math.floor((report.progress || 0) * 40) + 10 // 10-50%
        onProgress?.(progress, report.text || 'Model laden...')
      },
    })

    onProgress?.(50, 'Samenvatting genereren...')

    const defaultPrompt = `Wees zo beknopt mogelijk. Alleen de belangrijkste punten.

Transcriptie:
${text}

Samenvatting:`
    const prompt = customPrompt
      ? `${customPrompt}\n\nTranscriptie:\n${text}\n\nSamenvatting:`
      : defaultPrompt

    const reply = await engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    })

    onProgress?.(90, 'Afronden...')

    const summary = reply.choices[0]?.message?.content || 'Geen samenvatting gegenereerd.'

    onProgress?.(100, 'Klaar!')

    return summary.trim()
  } catch (error) {
    console.error('WebLLM error:', error)
    throw new Error(`WebLLM summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Main summarization function that automatically selects the best method
 */
export async function summarizeText(
  text: string,
  type: SummaryType = 'key-points',
  onProgress?: (progress: number, status?: string) => void,
  customPrompt?: string
): Promise<{ summary: string; method: SummarizationMethod }> {
  const method = await detectSummarizationMethod()

  if (method === 'unsupported') {
    throw new Error(
      'Samenvatting wordt niet ondersteund in deze browser. Gebruik Chrome 128+ of een browser met WebGPU-ondersteuning.'
    )
  }

  let summary: string

  if (method === 'chrome-api') {
    onProgress?.(0, 'Samenvatten met Chrome AI...')
    summary = await summarizeWithChromeAPI(text, type, (p) => onProgress?.(p, 'Samenvatten...'), customPrompt)
  } else {
    onProgress?.(0, 'WebLLM model laden...')
    summary = await summarizeWithWebLLM(text, type, onProgress, customPrompt)
  }

  return { summary, method }
}
