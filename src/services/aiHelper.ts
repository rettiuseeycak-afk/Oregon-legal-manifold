import { GoogleGenAI } from '@google/genai';

/**
 * Executes a Gemini model request with automatic fallback rotation when encountering 429 rate/quota errors
 * or permission/access issues (e.g., missing paid tier key).
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  }
) {
  const modelChain: string[] = [];

  // Construct a sequence of candidate models based on intent
  if (params.model === 'gemini-3.1-pro-preview' || params.model === 'gemini-1.5-pro') {
    modelChain.push('gemini-3.1-pro-preview');
    modelChain.push('gemini-3.5-flash');
    modelChain.push('gemini-flash-latest');
    modelChain.push('gemini-3.1-flash-lite');
  } else if (params.model === 'gemini-3.5-flash' || params.model === 'gemini-1.5-flash') {
    modelChain.push('gemini-3.5-flash');
    modelChain.push('gemini-flash-latest');
    modelChain.push('gemini-3.1-flash-lite');
  } else {
    modelChain.push(params.model);
    if (params.model !== 'gemini-3.5-flash') {
      modelChain.push('gemini-3.5-flash');
    }
    modelChain.push('gemini-flash-latest');
    modelChain.push('gemini-3.1-flash-lite');
  }

  // Remove potential duplicates
  const uniqueModels = Array.from(new Set(modelChain));

  let lastError: any = null;

  for (const currentModel of uniqueModels) {
    try {
      console.log(`[AI HELPER] Attempting call with model: ${currentModel}`);
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      return response;
    } catch (err: any) {
      lastError = err;

      const errMsg = (err.message || "").toLowerCase();
      const isQuotaError =
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("resource_exhausted") ||
        errMsg.includes("rate-limits") ||
        errMsg.includes("limit: 20") ||
        err.status === 429 ||
        err.code === 429;

      const isModelAccessError =
        errMsg.includes("not found") ||
        errMsg.includes("not enabled") ||
        errMsg.includes("developer key") ||
        errMsg.includes("permission_denied") ||
        errMsg.includes("access");

      const isTimeoutOrAbort =
        err.name === "AbortError" ||
        err.name === "TimeoutError" ||
        errMsg.includes("abort") ||
        errMsg.includes("timeout") ||
        errMsg.includes("deadline") ||
        errMsg.includes("cancel") ||
        errMsg.includes("fetch failed") ||
        err.status === 408 ||
        err.status === 504 ||
        err.status === 502 ||
        err.status === 503 ||
        err.status === 499;

      const isFallbackCandidate = isQuotaError || isModelAccessError || isTimeoutOrAbort;
      const index = uniqueModels.indexOf(currentModel);
      const hasMoreCandidates = index < uniqueModels.length - 1;

      if (isFallbackCandidate && hasMoreCandidates) {
        console.log(`[AI HELPER] Candidate model ${currentModel} temporary occupied or unavailable. Automatically shifting candidate...`);
        continue;
      } else {
        console.warn(`[AI HELPER] Execution completed with alert context on ${currentModel}:`, errMsg.substring(0, 180));
        throw err;
      }
    }
  }

  throw lastError || new Error("All fallback models exhausted");
}
