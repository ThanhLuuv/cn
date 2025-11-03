export async function POST(request: Request) {
  const key = process.env.AZURE_SPEECH_KEY || process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;
  if (!key || !region) {
    return new Response(JSON.stringify({ error: 'Server missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  const form = await request.formData();
  const file = form.get('audio') as File | null;
  const reference = (form.get('reference') as string | null) || '';
  const locale = ((form.get('locale') as string | null) || 'zh-CN').trim();
  if (!file || !reference) {
    return new Response(JSON.stringify({ error: 'Missing audio or reference' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const audioBuf = Buffer.from(await file.arrayBuffer());
  const config = {
    ReferenceText: reference,
    GradingSystem: 'HundredMark',
    Granularity: 'Word', // align by words for sentence assessment
    Dimension: 'Comprehensive', // unlock fluency/completeness
    EnableProsodyAssessment: 'True', // prosody score
    EnableMiscue: 'True',
  };
  const configB64 = Buffer.from(JSON.stringify(config)).toString('base64');

  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(locale)}&format=detailed`;
  
  // Retry logic with exponential backoff for rate limiting (429)
  const maxRetries = 3;
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Accept': 'application/json',
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          'Pronunciation-Assessment': configB64,
        },
        body: audioBuf,
        cache: 'no-store',
      });
      
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      }
      
      const detail = await res.text();
      lastError = { status: res.status, detail };
      
      // If 429 (rate limit) and we have retries left, retry
      if (res.status === 429 && attempt < maxRetries) {
        continue;
      }
      
      // For other errors or final attempt, return error
      return new Response(JSON.stringify({ 
        error: 'Azure assess failed', 
        status: res.status, 
        detail,
        retried: attempt > 0,
        hint: res.status === 429 ? 'Rate limit exceeded. Please wait a moment and try again.' : undefined,
      }), { 
        status: res.status === 429 ? 429 : 502, 
        headers: { 'content-type': 'application/json' } 
      });
    } catch (e: any) {
      lastError = e;
      if (attempt < maxRetries) {
        throw e;
        continue;
      }
    }
  }
  
  // All retries exhausted
  return new Response(JSON.stringify({ 
    error: 'Azure assess failed after retries', 
    detail: lastError?.detail || lastError?.message || 'Unknown error',
    retried: true,
  }), { 
    status: 502, 
    headers: { 'content-type': 'application/json' } 
  });
}


