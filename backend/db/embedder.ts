/**
 * Text → vector embedding using @xenova/transformers.
 *
 * Runs a local ONNX model (no API keys needed). The model is downloaded
 * and cached on first use in `~/.cache/huggingface/`.
 *
 * Default model: `Xenova/all-MiniLM-L6-v2` (384-dimensional, ~23 MB).
 *
 * Usage:
 * ```ts
 * const embedder = new Embedder();
 * const vector = await embedder.embed("hello world");        // number[384]
 * const vectors = await embedder.embedBatch(["a", "b"]);     // number[][384]
 * ```
 */

// @ts-ignore — @xenova/transformers ships JS-only; no .d.ts
import { pipeline } from "@xenova/transformers";

// ─── Types ───────────────────────────────────────────────────────────

/** Internal pipeline callable — typed loosely because @xenova/transformers has no .d.ts. */
type EmbedPipeline = (
  text: string | string[],
  opts: { pooling: string; normalize: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>;

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";

// ─── Embedder ────────────────────────────────────────────────────────

export class Embedder {
  private model: string;
  private pipe: EmbedPipeline | null = null;
  private loading: Promise<EmbedPipeline> | null = null;

  constructor(model = DEFAULT_MODEL) {
    this.model = model;
  }

  // ── Lifecycle ───────────────────────────────────────────────────

  /**
   * Lazily load the pipeline. Concurrent callers share the same
   * loading promise so the model is only downloaded once.
   */
  private async getPipeline(): Promise<EmbedPipeline> {
    if (this.pipe) return this.pipe;

    if (!this.loading) {
      this.loading = pipeline("feature-extraction", this.model, {
        quantized: true,
      }).then((p: any) => {
        this.pipe = p;
        this.loading = null;
        return p;
      });
    }

    return this.loading;
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Embed a single text string.
   * @returns A flat `number[]` vector.
   */
  async embed(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data as Float32Array);
  }

  /**
   * Embed multiple texts in one call (batched).
   * @returns An array of `number[]` vectors (one per input).
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const extractor = await this.getPipeline();
    const output = await extractor(texts, {
      pooling: "mean",
      normalize: true,
    });

    const dim = output.dims[1]!; // vector dimension (always defined for 2D output)
    const flat = output.data as Float32Array;
    const vectors: number[][] = [];

    for (let i = 0; i < texts.length; i++) {
      vectors.push(Array.from(flat.slice(i * dim, (i + 1) * dim)));
    }

    return vectors;
  }

  /** The dimensionality of the model's output vectors. */
  async dimensions(): Promise<number> {
    const vec = await this.embed("test");
    return vec.length;
  }
}
