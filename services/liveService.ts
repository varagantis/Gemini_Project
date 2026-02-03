
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual PCM audio decoding for raw streaming bytes
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class LiveCallSession {
  private nextStartTime = 0;
  private inputAudioContext?: AudioContext;
  private outputAudioContext?: AudioContext;
  private sources = new Set<AudioBufferSourceNode>();
  private audioStream?: MediaStream;
  private videoInterval?: number;
  private sessionPromise?: Promise<any>;

  constructor() {}

  async start(
    callbacks: { onMessage: (msg: string) => void; onClose: () => void },
    videoElement?: HTMLVideoElement,
    projectContext?: string,
    initialStream?: MediaStream
  ) {
    // Initialize GoogleGenAI only when starting a session
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Use provided stream or fallback to camera
    const stream = initialStream || await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: videoElement ? { facingMode: 'environment' } : false 
    });
    
    this.audioStream = stream;

    if (videoElement) {
      videoElement.srcObject = stream;
    }

    const systemInstruction = `You are BuildSync AI, a professional master builder with visual intelligence.
      You are helping a user on-site as their personal expert partner. Watch their camera feed closely.
      Identify tools, materials, and project progress. Provide real-time, step-by-step vocal guidance.
      Warn about safety issues (structural, electrical, sharp tools). Be encouraging but technically precise.

      PROJECT CONTEXT AWARENESS:
      ${projectContext || "No prior history provided."}

      Your goal is to supervise the build based on the progress already made in the chat history.
      Do not ask for information that has already been provided in the history. Focus on what you see NOW.`;

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = this.inputAudioContext!.createMediaStreamSource(this.audioStream!);
          const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob: Blob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            this.sessionPromise?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(this.inputAudioContext!.destination);

          if (videoElement) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            this.videoInterval = window.setInterval(() => {
              if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                canvas.width = 320;
                canvas.height = (videoElement.videoHeight / videoElement.videoWidth) * 320;
                ctx?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                this.sessionPromise?.then((session) => {
                  session.sendRealtimeInput({
                    media: { data: base64Data, mimeType: 'image/jpeg' }
                  });
                });
              }
            }, 1000);
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext!.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioData), this.outputAudioContext!, 24000, 1);
            const source = this.outputAudioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputAudioContext!.destination);
            source.addEventListener('ended', () => {
                this.sources.delete(source);
            });
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }

          if (message.serverContent?.outputTranscription) {
            callbacks.onMessage(message.serverContent.outputTranscription.text);
          }
          
          if (message.serverContent?.interrupted) {
            this.sources.forEach(s => {
                try { s.stop(); } catch(e) {}
            });
            this.sources.clear();
            this.nextStartTime = 0;
          }
        },
        onerror: (e) => console.error("Live error", e),
        onclose: () => callbacks.onClose(),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        systemInstruction,
        outputAudioTranscription: {},
      }
    });

    return this.sessionPromise;
  }

  // Allow switching streams (e.g. from camera to screen share) without closing session
  updateStream(newStream: MediaStream, videoElement?: HTMLVideoElement) {
    if (videoElement) {
      videoElement.srcObject = newStream;
    }
    this.audioStream = newStream;
  }

  // Properly close the Live API session and release resources.
  stop() {
    if (this.videoInterval) clearInterval(this.videoInterval);
    this.audioStream?.getTracks().forEach(t => t.stop());
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sources.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
    this.sessionPromise?.then(session => session.close());
  }
}
