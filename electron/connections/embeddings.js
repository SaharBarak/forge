/**
 * Embedding service — lazy-loaded on-device text embedding.
 *
 * Uses Hugging Face Transformers.js v4 running in the Electron main process
 * (Node). The model is loaded once, stays in memory for the app lifetime, and
 * streams every subsequent embedding through the same pipeline instance.
 *
 * Model: Xenova/all-MiniLM-L6-v2 — 22M params, 384 dims, ~22 MB on disk.
 * Downloaded from Hugging Face on first run, cached in
 * `~/.cache/huggingface/` automatically by Transformers.js.
 *
 * Public surface:
 *   await ensureReady()                → idempotent warmup
 *   await embed(text)                   → Float32Array(384)
 *   await embedMany([text1, text2])     → Float32Array[]
 *   getStatus()                         → { loaded, loading, model, dimensions }
 */

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const DIMENSIONS = 384;

let pipelinePromise = null; // single-flight loader
let pipelineInstance = null;
let loading = false;

/**
 * Dynamic import keeps Transformers.js out of the cold-start path. Electron
 * main is ESM, and Transformers.js exposes both ESM and CJS via conditional
 * exports — the dynamic import will resolve to whichever the runtime
 * supports.
 */
const loadPipeline = async () => {
  const { pipeline, env } = await import('@huggingface/transformers');

  // Allow remote model downloads (default) but disable local-only mode so a
  // fresh install can bootstrap itself.
  env.allowRemoteModels = true;
  env.allowLocalModels = true;

  // Feature extraction is the standard task for sentence embeddings.
  return pipeline('feature-extraction', MODEL_ID, {
    // `quantized: true` would halve memory but we keep full precision for
    // better small-model quality. Revisit if bundle size becomes an issue.
    quantized: false,
  });
};

/**
 * Idempotent warmup. Safe to call many times — subsequent calls return the
 * same in-flight or resolved promise.
 */
export const ensureReady = async () => {
  if (pipelineInstance) return pipelineInstance;
  if (pipelinePromise) return pipelinePromise;

  loading = true;
  pipelinePromise = loadPipeline()
    .then((p) => {
      pipelineInstance = p;
      loading = false;
      console.log('[embeddings] model loaded:', MODEL_ID);
      return p;
    })
    .catch((err) => {
      loading = false;
      pipelinePromise = null; // allow retry
      console.error('[embeddings] failed to load model:', err);
      throw err;
    });

  return pipelinePromise;
};

/**
 * Embed a single string into a normalized 384-dim Float32Array.
 */
export const embed = async (text) => {
  const pipe = await ensureReady();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  // Transformers.js returns a Tensor — `.data` is the flat Float32Array.
  return new Float32Array(output.data);
};

/**
 * Batched embedding. Transformers.js handles batching natively so this is
 * materially faster than a loop of single embeds.
 */
export const embedMany = async (texts) => {
  const pipe = await ensureReady();
  const output = await pipe(texts, { pooling: 'mean', normalize: true });
  // For a batch, output.data is a flat Float32Array of length n*dim. Split
  // back into per-text views.
  const result = [];
  for (let i = 0; i < texts.length; i++) {
    const start = i * DIMENSIONS;
    const end = start + DIMENSIONS;
    result.push(new Float32Array(output.data.slice(start, end)));
  }
  return result;
};

export const getStatus = () => ({
  loaded: !!pipelineInstance,
  loading,
  model: MODEL_ID,
  dimensions: DIMENSIONS,
});

export const EMBEDDING_DIMENSIONS = DIMENSIONS;
