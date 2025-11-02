// Azure Speech SDK - Pronunciation Assessment (client-side only)
// NOTE: Using subscription key in client is not secure; consider using an auth token endpoint in production.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

let cachedToken: { token: string; region: string; exp: number } | null = null;
async function getSpeechConfig(): Promise<sdk.SpeechConfig> {
  const now = Date.now();
  if (!cachedToken || cachedToken.exp <= now) {
    const res = await fetch('/api/azure/token', { method: 'POST', cache: 'no-store', headers: { 'x-requested-with': 'XMLHttpRequest' } });
    if (!res.ok) throw new Error('Failed to fetch Azure token');
    const { token, region, expiresIn } = await res.json();
    cachedToken = { token, region, exp: now + Math.max(1000, (expiresIn ?? 540) * 1000) - 5_000 };
  }
  const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(cachedToken.token, cachedToken.region);
  return speechConfig;
}

export type AzureAssessResult = {
  overall: number; // 0..100
  accuracy: number;
  fluency: number;
  completeness: number;
  raw: any;
};

export async function assessPronunciation(referenceText: string, locale: string = 'zh-CN'): Promise<AzureAssessResult> {
  const speechConfig = await getSpeechConfig();
  speechConfig.speechRecognitionLanguage = locale;

  const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  const paConfig = new sdk.PronunciationAssessmentConfig(
    referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true // enable miscue
  );
  paConfig.applyTo(recognizer);

  const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (res: any) => resolve(res),
      (err: any) => reject(err)
    );
  });

  const paResult = sdk.PronunciationAssessmentResult.fromResult(result);
  const out: AzureAssessResult = {
    overall: Number(paResult.pronunciationScore || 0),
    accuracy: Number(paResult.accuracyScore || 0),
    fluency: Number(paResult.fluencyScore || 0),
    completeness: Number(paResult.completenessScore || 0),
    raw: JSON.parse((result.properties as any).get?.(sdk.PropertyId.SpeechServiceResponse_JsonResult) || '{}'),
  };

  recognizer.close();
  return out;
}
export async function assessPronunciationFromWav(referenceText: string, wavData: ArrayBuffer, locale: string = 'zh-CN'): Promise<AzureAssessResult> {
  const speechConfig = await getSpeechConfig();
  speechConfig.speechRecognitionLanguage = locale;
  // Convert ArrayBuffer to Buffer for SDK compatibility
  const buffer = Buffer.from(wavData);
  const audioConfig = sdk.AudioConfig.fromWavFileInput(buffer as any);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  const paConfig = new sdk.PronunciationAssessmentConfig(
    referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true
  );
  paConfig.applyTo(recognizer);
  const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (res: any) => resolve(res),
      (err: any) => reject(err)
    );
  });
  const paResult = sdk.PronunciationAssessmentResult.fromResult(result);
  const out: AzureAssessResult = {
    overall: Number(paResult.pronunciationScore || 0),
    accuracy: Number(paResult.accuracyScore || 0),
    fluency: Number(paResult.fluencyScore || 0),
    completeness: Number(paResult.completenessScore || 0),
    raw: JSON.parse((result.properties as any).get?.(sdk.PropertyId.SpeechServiceResponse_JsonResult) || '{}'),
  };
  recognizer.close();
  return out;
}


export type AzurePronunciationSession = {
  start: () => Promise<void>;
  stop: () => Promise<AzureAssessResult | null>;
  dispose: () => void;
};

export function createPronunciationSession(referenceText: string, locale: string = 'zh-CN'): AzurePronunciationSession {
  // We will lazily create recognizer on start() to allow async token fetch
  let recognizer: sdk.SpeechRecognizer | null = null;
  let last: AzureAssessResult | null = null;

  const buildRecognizer = async () => {
    const speechConfig = await getSpeechConfig();
    speechConfig.speechRecognitionLanguage = locale;
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const r = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    const paConfig = new sdk.PronunciationAssessmentConfig(
    referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true
    );
    paConfig.applyTo(r);
    r.recognized = (_s: any, e: any) => {
      const res = e.result as sdk.SpeechRecognitionResult;
      if (!res) return;
      const pa = sdk.PronunciationAssessmentResult.fromResult(res);
      if (!pa) return;
      try {
        last = {
          overall: Number(pa.pronunciationScore || 0),
          accuracy: Number(pa.accuracyScore || 0),
          fluency: Number(pa.fluencyScore || 0),
          completeness: Number(pa.completenessScore || 0),
          raw: JSON.parse((res.properties as any).get?.(sdk.PropertyId.SpeechServiceResponse_JsonResult) || '{}'),
        };
      } catch {
        last = {
          overall: Number(pa.pronunciationScore || 0),
          accuracy: Number(pa.accuracyScore || 0),
          fluency: Number(pa.fluencyScore || 0),
          completeness: Number(pa.completenessScore || 0),
          raw: null,
        };
      }
    };
    return r;
  };

  return {
    start: async () => {
      if (!recognizer) recognizer = await buildRecognizer();
      await new Promise<void>((resolve, reject) => {
        recognizer!.startContinuousRecognitionAsync(() => resolve(), (e: any) => reject(e));
      });
    },
    stop: () => new Promise<AzureAssessResult | null>((resolve) => {
      if (!recognizer) return resolve(last);
      recognizer.stopContinuousRecognitionAsync(() => resolve(last), () => resolve(last));
    }),
    dispose: () => { try { recognizer?.close(); } catch {} recognizer = null; },
  };
}


