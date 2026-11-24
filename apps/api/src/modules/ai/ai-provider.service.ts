import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../../config/env.service';

export interface ProviderTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Optional model provider. Every method returns null when no key is configured or the call fails, and callers then
 * use their deterministic rules. Server-side only: the key never reaches the browser.
 */
@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(env: EnvService) {
    const key = env.get('ANTHROPIC_API_KEY');
    this.client = key ? new Anthropic({ apiKey: key, timeout: 30_000, maxRetries: 1 }) : null;
    this.model = env.get('AI_MODEL');
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /** Plain-text answer, or null. */
  async text(system: string, turns: readonly ProviderTurn[], maxTokens = 2000): Promise<string | null> {
    const message = await this.create(system, turns, maxTokens);
    if (!message) return null;
    const text = message.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    return text || null;
  }

  /** JSON matching `schema` (structured outputs), parsed but NOT validated: callers validate every field. */
  async json(system: string, prompt: string, schema: Record<string, unknown>, maxTokens = 1500): Promise<unknown> {
    const raw = await this.create(system, [{ role: 'user', content: prompt }], maxTokens, schema);
    if (!raw) return null;
    const text = raw.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    try {
      return JSON.parse(text);
    } catch {
      this.logger.warn('Model returned invalid JSON; using rules');
      return null;
    }
  }

  private async create(system: string, turns: readonly ProviderTurn[], maxTokens: number, schema?: Record<string, unknown>) {
    if (!this.client) return null;
    try {
      const message = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: turns.map((t) => ({ role: t.role, content: t.content })),
        output_config: { effort: 'low', ...(schema ? { format: { type: 'json_schema', schema } } : {}) },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
      if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
        this.logger.warn(`Model stopped with ${message.stop_reason}; using rules`);
        return null;
      }
      return message;
    } catch (err) {
      if (err instanceof Anthropic.APIError) this.logger.warn(`Model call failed (${err.status ?? 'network'}); using rules`);
      else this.logger.warn('Model call failed; using rules');
      return null;
    }
  }
}
