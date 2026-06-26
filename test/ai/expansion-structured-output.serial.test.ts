/**
 * Expansion structured-output transport guard (fork — Entry 8).
 *
 * The fork runs query-expansion against LM Studio (openai-compatible), which
 * REQUIRES `response_format: { type: 'json_schema' }` and rejects the SDK's
 * default `{ type: 'json_object' }` with a 400. The fix is the recipe flag
 * `supports_structured_outputs`, threaded into `instantiateExpansion`'s
 * `createOpenAICompatible({ supportsStructuredOutputs })` call.
 *
 * This guard proves the flag actually flips the on-the-wire `response_format`
 * (a future @ai-sdk/openai-compatible bump or a runtime re-sync could silently
 * revert it). Same synthetic-recipe + captured-fetch pattern as
 * header-transport.serial.test.ts (RECIPES.set/.delete seam).
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { configureGateway, resetGateway, expand } from '../../src/core/ai/gateway.ts';
import { RECIPES } from '../../src/core/ai/recipes/index.ts';
import type { Recipe } from '../../src/core/ai/types.ts';

function makeFakeExpansionFetch(capture: { body: string | null }) {
  return async (input: any, init?: any): Promise<Response> => {
    capture.body = init?.body && typeof init.body === 'string'
      ? init.body
      : (input instanceof Request ? await input.text() : null);
    // Valid ExpansionSchema content so generateObject resolves.
    const json = {
      id: 'fake-exp-1', object: 'chat.completion', created: 0, model: 'fake-exp-model',
      choices: [{ index: 0, message: { role: 'assistant', content: '{"queries":["alpha","beta","gamma"]}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    };
    return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

const flaggedCapture: { body: string | null } = { body: null };
const plainCapture: { body: string | null } = { body: null };

const EXP_TOUCHPOINT = { models: ['fake-exp-model'], cost_per_1m_tokens_usd: 0, price_last_verified: '2026-06-25' };

const FLAGGED_RECIPE: Recipe = {
  id: 'synthetic-exp-structured',
  name: 'Synthetic Exp Structured',
  tier: 'openai-compat',
  implementation: 'openai-compatible',
  base_url_default: 'https://synthetic.test/v1',
  supports_structured_outputs: true,
  auth_env: { required: [] },
  touchpoints: { expansion: EXP_TOUCHPOINT },
  resolveOpenAICompatConfig() {
    return { baseURL: 'https://synthetic.test/v1', fetch: makeFakeExpansionFetch(flaggedCapture) as unknown as typeof fetch };
  },
};

const PLAIN_RECIPE: Recipe = {
  id: 'synthetic-exp-plain',
  name: 'Synthetic Exp Plain',
  tier: 'openai-compat',
  implementation: 'openai-compatible',
  base_url_default: 'https://synthetic.test/v1',
  // no supports_structured_outputs → SDK default (json_object)
  auth_env: { required: [] },
  touchpoints: { expansion: EXP_TOUCHPOINT },
  resolveOpenAICompatConfig() {
    return { baseURL: 'https://synthetic.test/v1', fetch: makeFakeExpansionFetch(plainCapture) as unknown as typeof fetch };
  },
};

beforeAll(() => {
  RECIPES.set(FLAGGED_RECIPE.id, FLAGGED_RECIPE);
  RECIPES.set(PLAIN_RECIPE.id, PLAIN_RECIPE);
});
afterAll(() => {
  RECIPES.delete(FLAGGED_RECIPE.id);
  RECIPES.delete(PLAIN_RECIPE.id);
  resetGateway();
});

describe('expansion structured-output flag (fork Entry 8)', () => {
  test('supports_structured_outputs:true → response_format.type === json_schema', async () => {
    flaggedCapture.body = null;
    configureGateway({ expansion_model: `${FLAGGED_RECIPE.id}:fake-exp-model`, env: {} });
    const out = await expand('seed query');
    expect(out.length).toBeGreaterThan(1); // original + rewrites
    expect(flaggedCapture.body, 'fake expansion fetch should have been invoked').not.toBeNull();
    const body = JSON.parse(flaggedCapture.body!);
    expect(body.response_format?.type).toBe('json_schema');
  });

  test('without the flag → response_format.type === json_object (the LM-Studio-rejected default)', async () => {
    plainCapture.body = null;
    configureGateway({ expansion_model: `${PLAIN_RECIPE.id}:fake-exp-model`, env: {} });
    const out = await expand('seed query');
    expect(out.length).toBeGreaterThan(1);
    expect(plainCapture.body, 'fake expansion fetch should have been invoked').not.toBeNull();
    const body = JSON.parse(plainCapture.body!);
    expect(body.response_format?.type).toBe('json_object');
  });
});
