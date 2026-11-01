import { z } from 'zod';
import type { EventBrief } from '../src/domain/types';
import { validateAdvice } from '../src/domain/validation';
import { ADVICE_JSON_SCHEMA, eventPrompt, SYSTEM_PROMPT } from './prompt';
import { HTTPError, readBounded } from './http';

const providerResponse = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.literal('STOP'),
        content: z.object({
          parts: z
            .array(z.object({ text: z.string().optional(), thought: z.boolean().optional() }))
            .max(32),
        }),
      }),
    )
    .min(1)
    .max(8),
});

export async function generateAdvice(
  brief: EventBrief,
  apiKey: string,
  model: string,
  fetcher: typeof fetch,
) {
  if (!/^gemini-[a-z0-9.-]+$/.test(model))
    throw new HTTPError(503, 'The planning model is not configured correctly.');
  const prompt = eventPrompt(brief);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseJsonSchema: ADVICE_JSON_SCHEMA,
          },
        }),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429)
        throw new HTTPError(
          429,
          'Gemini is at its usage limit. Wait a minute, then retry, or use a starter plan.',
        );
      throw new HTTPError(
        502,
        'Gemini could not complete this plan. Your existing plans are safe; retry or use a starter plan.',
      );
    }
    const raw = await readBounded(response.body, 131_072);
    let text: string;
    let advice;
    try {
      const result = providerResponse.parse(JSON.parse(raw));
      text = result.candidates[0].content.parts
        .filter((part) => !part.thought)
        .map((part) => part.text ?? '')
        .join('');
      if (text.length > 50_000) throw new Error('Output too long');
      advice = validateAdvice(JSON.parse(text));
    } catch {
      throw new HTTPError(
        502,
        'Gemini returned an incomplete or invalid plan. Nothing was saved. Please retry or use a starter plan.',
      );
    }
    return {
      advice,
      trace: {
        prompt: `SYSTEM INSTRUCTIONS\n${SYSTEM_PROMPT}\n\nEVENT INPUT\n${prompt}`,
        response: text,
        model,
      },
    };
  } catch (error) {
    if (controller.signal.aborted)
      throw new HTTPError(504, 'Planning took too long. Your existing work is safe. Please retry.');
    if (error instanceof HTTPError && error.status !== 413) throw error;
    throw new HTTPError(
      502,
      'The AI service is temporarily unavailable. Your existing plans are safe; retry or use a starter plan.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
