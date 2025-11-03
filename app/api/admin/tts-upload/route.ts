import { r2PutObject } from '@/services/r2';
import textToSpeech from '@google-cloud/text-to-speech';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as any;
    const text = body?.text as string;
    const path = body?.path as string; // e.g., audio_samples/topic/slug.mp3
    const languageCode = body?.languageCode || process.env.GOOGLE_TTS_LANGUAGE || 'zh-CN';
    const voiceName = body?.voiceName || process.env.GOOGLE_TTS_VOICE || undefined;
    const gender = body?.gender || process.env.GOOGLE_TTS_GENDER || 'NEUTRAL';
    const speakingRate = Number(body?.speakingRate ?? process.env.GOOGLE_TTS_RATE ?? 0.85);
    const pitch = Number(body?.pitch ?? process.env.GOOGLE_TTS_PITCH ?? 0);
    const audioEncoding = body?.audioEncoding || process.env.GOOGLE_TTS_ENCODING || 'MP3';

    if (!text || !path) return new Response(JSON.stringify({ error: 'Missing text or path' }), { status: 400 });

    const credsJson = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
    if (!credsJson) {
      return new Response(JSON.stringify({ error: 'Missing GOOGLE_TTS_CREDENTIALS_JSON', hint: 'Check .env.local on server' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }

    let credentials;
    try {
      credentials = typeof credsJson === 'string' ? JSON.parse(credsJson) : credsJson;
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'Invalid GOOGLE_TTS_CREDENTIALS_JSON format', detail: e?.message }), { status: 500, headers: { 'content-type': 'application/json' } });
    }

    const client = new textToSpeech.TextToSpeechClient({ credentials });

    // Build voice config: only include name if provided (and let Google auto-select if not)
    const voiceConfig: any = { languageCode, ssmlGender: gender as any };
    if (voiceName && voiceName.trim()) {
      voiceConfig.name = voiceName;
    }

    const [resp] = await client.synthesizeSpeech({
      input: { text },
      voice: voiceConfig,
      audioConfig: { audioEncoding: audioEncoding as any, speakingRate, pitch },
    });
    const audioContent = resp.audioContent;
    if (!audioContent) return new Response(JSON.stringify({ error: 'No audioContent from TTS' }), { status: 500, headers: { 'content-type': 'application/json' } });

    const arrayBuffer = audioContent instanceof Buffer ? audioContent : Buffer.from(audioContent as any);
    const url = await r2PutObject(path, arrayBuffer, 'audio/mpeg');

    return new Response(JSON.stringify({ url, path }), { headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'TTS upload failed', detail: e?.message, code: e?.code }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}


