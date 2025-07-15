import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

interface TTSRequestBody {
	text: string;
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = env.ELEVENLABS_API_KEY;
	// setted up a default (non-premium) voice id for cheaper tts
	// Premium voices are 10x more expensive than non-premium voices
	const voiceId = 'bIHbv24MWmeRgasZH58o';

	if (!apiKey) {
		console.error('ELEVENLABS_API_KEY is not set in environment variables.');
		throw error(500, 'TTS API key not configured. Please check server logs.');
	}

	if (!voiceId) {
		console.error('ELEVENLABS_VOICE_ID is not set in environment variables.');
		throw error(500, 'TTS Voice ID not configured. Please check server logs.');
	}

	let requestData: TTSRequestBody;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, "Invalid request body: Must be valid JSON with a 'text' property.");
	}

	const { text } = requestData;

	if (!text || typeof text !== 'string') {
		throw error(400, "Missing or invalid 'text' property in request body.");
	}

	try {
		// Use the phoneme timing endpoint if phonemes are requested
		const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`;

		const elevenLabsResponse = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'xi-api-key': apiKey,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				text: text,
				model_id: 'eleven_flash_v2_5',
				voice_settings: {
					stability: 0.5,
					similarity_boost: 0.75
				}
			})
		});

		if (!elevenLabsResponse.ok) {
			const errorBody = await elevenLabsResponse.text();
			console.error(
				`ElevenLabs API error: ${elevenLabsResponse.status} ${elevenLabsResponse.statusText}`,
				errorBody
			);
			throw error(
				502,
				`Failed to fetch audio from ElevenLabs: ${elevenLabsResponse.statusText} - ${errorBody}`
			);
		}

		// Handle JSON response with phoneme data
		const responseData = await elevenLabsResponse.json();

		// Simple debug logging
		console.log('[TTS API] Audio present:', !!responseData.audio_base64);
		console.log('[TTS API] Characters count:', responseData.alignment?.characters?.length || 0);

		// Extract phonemes from ElevenLabs response
		let phonemes = [];

		if (
			responseData.alignment?.characters &&
			responseData.alignment?.character_start_times_seconds &&
			responseData.alignment?.character_end_times_seconds
		) {
			const characters = responseData.alignment.characters;
			const startTimes = responseData.alignment.character_start_times_seconds;
			const endTimes = responseData.alignment.character_end_times_seconds;

			for (let i = 0; i < characters.length; i++) {
				phonemes.push({
					character: characters[i],
					start: startTimes[i],
					end: endTimes[i]
				});
			}
		} else {
			console.warn('[TTS API] Unexpected response structure from ElevenLabs');
		}

		console.log('[TTS API] Extracted phonemes count:', phonemes.length);
		if (phonemes.length > 0) {
			console.log('[TTS API] Sample phoneme structure:', phonemes[0]);
		}

		return json({
			audio_base64: responseData.audio_base64,
			phonemes: phonemes
		});
	} catch (e: any) {
		console.error('Error proxying TTS request to ElevenLabs:', e);
		if (e.status && e.body) {
			throw e;
		}
		throw error(500, `Internal server error: ${e.message || 'Unknown error'}`);
	}
};
