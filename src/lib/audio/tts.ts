import { VRMExpressionPresetName } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';

// --- TYPES ---
type PhonemeTiming = {
	phoneme: string;
	start: number; // seconds
	end: number; // seconds
};

// Emotion type based on LLM output
export type Emotion = 'angry' | 'happy' | 'neutral' | 'funny';

const emotionToVRMPreset: Partial<Record<Emotion, VRMExpressionPresetName>> = {
	happy: VRMExpressionPresetName.Happy,
	angry: VRMExpressionPresetName.Angry,
	funny: VRMExpressionPresetName.Happy // Map 'funny' to 'Happy' for now
	// 'neutral' will mean no specific emotional override before lip-sync
};

type ExpressionWeight = {
	expression: VRMExpressionPresetName;
	weight: number; // 0.0 to 1.0, relative weight within the combination
};

// --- CONFIGURATION ---
export interface LipSyncConfig {
	intensity: number; // 0.5 to 2.0
	smoothing: number; // 0.0 to 1.0
	debugLogging: boolean;
}

export const defaultLipSyncConfig: LipSyncConfig = {
	intensity: 1.0,
	smoothing: 0.3,
	debugLogging: true
};


// --- PRESETS ---
export const lipSyncPresets = {
	natural: { intensity: 0.8, smoothing: 0.4, debugLogging: false },
	expressive: { intensity: 1.2, smoothing: 0.2, debugLogging: false },
	subtle: { intensity: 0.6, smoothing: 0.5, debugLogging: false }
};

export function createLipSyncConfig(overrides: Partial<LipSyncConfig>): LipSyncConfig {
	return { ...defaultLipSyncConfig, ...overrides };
}

// --- IMPROVED PHONEME MAPPING WITH BLENDS ---
const phonemeToVRM: Record<string, ExpressionWeight[]> = {
	// Pure vowels
	A: [{ expression: VRMExpressionPresetName.Aa, weight: 1.0 }],
	AA: [{ expression: VRMExpressionPresetName.Aa, weight: 1.0 }],
	AH: [{ expression: VRMExpressionPresetName.Aa, weight: 0.8 }],

	// Blended vowels for better transitions
	AE: [
		{ expression: VRMExpressionPresetName.Aa, weight: 0.6 },
		{ expression: VRMExpressionPresetName.Ee, weight: 0.4 }
	],
	AO: [
		{ expression: VRMExpressionPresetName.Aa, weight: 0.3 },
		{ expression: VRMExpressionPresetName.Oh, weight: 0.7 }
	],
	AW: [
		{ expression: VRMExpressionPresetName.Aa, weight: 0.4 },
		{ expression: VRMExpressionPresetName.Oh, weight: 0.6 }
	],
	AY: [
		{ expression: VRMExpressionPresetName.Aa, weight: 0.7 },
		{ expression: VRMExpressionPresetName.Ih, weight: 0.3 }
	],

	// E sounds
	E: [{ expression: VRMExpressionPresetName.Ee, weight: 1.0 }],
	EH: [
		{ expression: VRMExpressionPresetName.Ee, weight: 0.7 },
		{ expression: VRMExpressionPresetName.Aa, weight: 0.3 }
	],
	ER: [
		{ expression: VRMExpressionPresetName.Ee, weight: 0.4 },
		{ expression: VRMExpressionPresetName.Ih, weight: 0.6 }
	],
	EY: [{ expression: VRMExpressionPresetName.Ee, weight: 1.0 }],

	// I sounds
	I: [{ expression: VRMExpressionPresetName.Ih, weight: 1.0 }],
	IH: [{ expression: VRMExpressionPresetName.Ih, weight: 1.0 }],
	IY: [
		{ expression: VRMExpressionPresetName.Ih, weight: 0.6 },
		{ expression: VRMExpressionPresetName.Ee, weight: 0.4 }
	],

	// O sounds
	O: [{ expression: VRMExpressionPresetName.Oh, weight: 1.0 }],
	OH: [{ expression: VRMExpressionPresetName.Oh, weight: 1.0 }],
	OW: [{ expression: VRMExpressionPresetName.Oh, weight: 1.0 }],
	OY: [
		{ expression: VRMExpressionPresetName.Oh, weight: 0.8 },
		{ expression: VRMExpressionPresetName.Ih, weight: 0.2 }
	],

	// U sounds
	U: [{ expression: VRMExpressionPresetName.Ou, weight: 1.0 }],
	UH: [
		{ expression: VRMExpressionPresetName.Ou, weight: 0.7 },
		{ expression: VRMExpressionPresetName.Aa, weight: 0.3 }
	],
	UW: [{ expression: VRMExpressionPresetName.Ou, weight: 1.0 }],

	// Consonants - some create slight mouth movements
	M: [{ expression: VRMExpressionPresetName.Neutral, weight: 1.0 }],
	B: [{ expression: VRMExpressionPresetName.Neutral, weight: 1.0 }],
	P: [{ expression: VRMExpressionPresetName.Neutral, weight: 1.0 }],

	// F and V can show slight lip movement
	F: [
		{ expression: VRMExpressionPresetName.Neutral, weight: 0.8 },
		{ expression: VRMExpressionPresetName.Ou, weight: 0.2 }
	],
	V: [
		{ expression: VRMExpressionPresetName.Neutral, weight: 0.8 },
		{ expression: VRMExpressionPresetName.Ou, weight: 0.2 }
	],

	// TH sounds can show slight tongue/lip movement
	TH: [
		{ expression: VRMExpressionPresetName.Neutral, weight: 0.7 },
		{ expression: VRMExpressionPresetName.Aa, weight: 0.3 }
	],

	// L can have slight tongue movement affecting mouth shape
	L: [
		{ expression: VRMExpressionPresetName.Neutral, weight: 0.8 },
		{ expression: VRMExpressionPresetName.Ih, weight: 0.2 }
	],

	// R sounds
	R: [
		{ expression: VRMExpressionPresetName.Neutral, weight: 0.6 },
		{ expression: VRMExpressionPresetName.Ou, weight: 0.4 }
	],

	// Default fallback
	NEUTRAL: [{ expression: VRMExpressionPresetName.Neutral, weight: 1.0 }]
};

// --- LIP SYNC ANIMATOR ---
class LipSyncAnimator {
	private vrm: VRM;
	private proxy: any;
	private currentValues: Map<VRMExpressionPresetName, number> = new Map();
	private stopRequested = false;

	constructor(vrm: VRM) {
		this.vrm = vrm;
		this.proxy = vrm.expressionManager;

		// Initialize all expressions to 0 except neutral
		Object.values(VRMExpressionPresetName).forEach((preset) => {
			const value = preset === VRMExpressionPresetName.Neutral ? 1.0 : 0.0;
			this.currentValues.set(preset, value);
			if (this.proxy) {
				this.proxy.setValue(preset, value);
			}
		});
	}

	setBlendedExpression(expressionWeights: ExpressionWeight[], globalIntensity: number = 1.0) {
		if (!this.proxy || this.stopRequested) return;

		// Reset all mouth expressions
		const mouthExpressions = [
			VRMExpressionPresetName.Aa,
			VRMExpressionPresetName.Ee,
			VRMExpressionPresetName.Ih,
			VRMExpressionPresetName.Oh,
			VRMExpressionPresetName.Ou,
			VRMExpressionPresetName.Neutral
		];

		// Calculate total weight for normalization
		const totalWeight = expressionWeights.reduce((sum, ew) => sum + ew.weight, 0);
		const normalizer = totalWeight > 0 ? 1.0 / totalWeight : 1.0;

		// Reset all mouth expressions first
		mouthExpressions.forEach((expr) => {
			this.currentValues.set(expr, 0.0);
			this.proxy.setValue(expr, 0.0);
		});

		// Apply blended expressions
		let neutralWeight = 0.0;
		expressionWeights.forEach(({ expression, weight }) => {
			const normalizedWeight = weight * normalizer * globalIntensity;
			this.currentValues.set(expression, normalizedWeight);
			this.proxy.setValue(expression, normalizedWeight);
			neutralWeight += normalizedWeight;
		});

		// Set neutral to fill the remaining weight
		const finalNeutralWeight = Math.max(0.0, 1.0 - neutralWeight);
		this.currentValues.set(VRMExpressionPresetName.Neutral, finalNeutralWeight);
		this.proxy.setValue(VRMExpressionPresetName.Neutral, finalNeutralWeight);
	}

	// Keep the old method for backward compatibility
	setExpression(expression: VRMExpressionPresetName, weight: number) {
		this.setBlendedExpression([{ expression, weight }], 1.0);
	}

	reset() {
		this.stopRequested = true;
		if (!this.proxy) return;

		// Reset to neutral
		Object.values(VRMExpressionPresetName).forEach((preset) => {
			const value = preset === VRMExpressionPresetName.Neutral ? 1.0 : 0.0;
			this.currentValues.set(preset, value);
			this.proxy.setValue(preset, value);
		});
	}

	stop() {
		this.reset();
	}
}

// --- TTS WITH PHONEMES ---
async function fetchSpeechWithPhonemes(
	text: string
): Promise<{ audioBuffer: AudioBuffer; timings: PhonemeTiming[] }> {
	console.log('[TTS] Requesting speech with phonemes for:', text.substring(0, 50));

	const response = await fetch('/api/tts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text })
	});

	if (!response.ok) {
		throw new Error(`TTS API error: ${response.status}`);
	}

	const data = await response.json();

	console.log('[TTS] API Response structure:', {
		hasAudio: !!data.audio_base64,
		hasPhonemes: !!data.phonemes,
		phonemesLength: data.phonemes?.length || 0
	});

	// Convert base64 audio to AudioBuffer
	const audioBase64 = data.audio_base64 || data.audio;
	if (!audioBase64) {
		throw new Error('No audio data in response');
	}

	const audioData = atob(audioBase64);
	const audioArrayBuffer = new ArrayBuffer(audioData.length);
	const audioView = new Uint8Array(audioArrayBuffer);

	for (let i = 0; i < audioData.length; i++) {
		audioView[i] = audioData.charCodeAt(i);
	}

	const audioCtx = new AudioContext();
	const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);

	// Extract phoneme timings
	const timings: PhonemeTiming[] = [];

	if (data.phonemes && Array.isArray(data.phonemes)) {
		data.phonemes.forEach((phoneme: any) => {
			if (
				phoneme.character &&
				typeof phoneme.start === 'number' &&
				typeof phoneme.end === 'number'
			) {
				timings.push({
					phoneme: phoneme.character.toUpperCase(),
					start: phoneme.start,
					end: phoneme.end
				});
			}
		});
	}

	console.log(`[TTS] Extracted ${timings.length} phoneme timings`);
	if (timings.length > 0) {
		console.log('[TTS] First few timings:', timings.slice(0, 5));
	}

	return { audioBuffer, timings };
}

// --- MAIN SPEAK FUNCTION ---
export async function speakWithLipsync(
	text: string,
	vrm: VRM,
	config: Partial<LipSyncConfig> = {},
	emotion?: Emotion // Added emotion parameter
): Promise<void> {
	// Ensure it returns Promise<void>
	const finalConfig = { ...defaultLipSyncConfig, ...config };

	return new Promise(async (resolveSpeak, rejectSpeak) => {
		try {
			if (finalConfig.debugLogging) {
				console.log(
					`[TTS] Starting lip sync for: ${text.substring(0, 50)}, Emotion: ${emotion || 'default'}`
				);
			}

			// Get audio and timing data with phonemes
			const { audioBuffer, timings } = await fetchSpeechWithPhonemes(text);

			if (!timings.length && !audioBuffer) {
				// Check for audioBuffer too
				console.warn('[TTS] No timings or audio buffer, cannot play.');
				resolveSpeak(); // Resolve if nothing to play
				return;
			}

			// Create animator
			const animator = new LipSyncAnimator(vrm);

			// Set base emotion before starting lip-sync and audio
			if (emotion && emotion !== 'neutral' && vrm.expressionManager) {
				const targetPreset = emotionToVRMPreset[emotion];
				if (targetPreset) {
					vrm.expressionManager.setValue(VRMExpressionPresetName.Happy, 0);
					vrm.expressionManager.setValue(VRMExpressionPresetName.Angry, 0);
					vrm.expressionManager.setValue(VRMExpressionPresetName.Sad, 0);
					vrm.expressionManager.setValue(VRMExpressionPresetName.Surprised, 0);
					vrm.expressionManager.setValue(targetPreset, 1.0);
					if (finalConfig.debugLogging) {
						console.log(`[TTS] Set base emotion to: ${emotion} (${targetPreset})`);
					}
				}
			}

			// Start audio
			const audioCtx = new AudioContext();
			const audioSource = audioCtx.createBufferSource();
			audioSource.buffer = audioBuffer;
			audioSource.connect(audioCtx.destination);

			// Event listener for when audio finishes
			audioSource.onended = () => {
				if (finalConfig.debugLogging) {
					console.log('[TTS] Audio source finished playing.');
				}
				// The final reset and promise resolution will happen in the setTimeout below,
				// which is timed relative to the audioBuffer.duration.
			};
			audioSource.start();

			if (finalConfig.debugLogging) {
				console.log(`[TTS] Playing audio and ${timings.length} phoneme animations`);
			}

			// Schedule all lip sync animations using the improved phoneme mapping
			timings.forEach(({ phoneme, start, end }) => {
				const expressionWeights = phonemeToVRM[phoneme] || phonemeToVRM['NEUTRAL'];
				setTimeout(() => {
					animator.setBlendedExpression(expressionWeights, finalConfig.intensity);
				}, start * 1000);
			});

			// Reset to neutral after audio ends + small buffer
			const totalDuration = audioBuffer.duration;
			setTimeout(
				() => {
					animator.stop(); // This will reset expressions to Neutral
					if (finalConfig.debugLogging) {
						console.log('[TTS] Lip sync completed, animator stopped and expressions reset.');
					}
					resolveSpeak(); // Resolve the main promise here
				},
				(totalDuration + 0.25) * 1000
			); // Reduced buffer slightly to 0.25s
		} catch (error) {
			console.error('[TTS] Error in speakWithLipsync:', error);
			rejectSpeak(error); // Reject the main promise on error
		}
	});
}

