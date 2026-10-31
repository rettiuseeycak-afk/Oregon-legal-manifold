export async function generateContentProxy(params: {
  model?: string;
  contents: any;
  config?: any;
}) {
  let attempts = 0;
  const maxAttempts = 3;
  const delayMs = 1500;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data as { text: string };
    } catch (err: any) {
      attempts++;
      const isAbortOrTimeout = 
        err.name === 'AbortError' || 
        err.name === 'TimeoutError' || 
        (err.message && err.message.toLowerCase().includes('abort')) ||
        (err.message && err.message.toLowerCase().includes('timeout')) ||
        (err.message && err.message.toLowerCase().includes('fetch'));

      if (isAbortOrTimeout && attempts < maxAttempts) {
        console.warn(`[GEMINI CLIENT] generateContentProxy encountered transient error (attempt ${attempts}/${maxAttempts}):`, err.message || err);
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempts));
        continue;
      }
      throw err;
    }
  }
  throw new Error('AI Generation proxy call exceeded maximum retry attempts.');
}
