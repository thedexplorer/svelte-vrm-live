import type { ChatMessage } from '$lib/types/chat';
import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI, type Schema, SchemaType } from '@google/generative-ai';
import { GOOGLE_API_KEY } from '$env/static/private';
import { dev } from '$app/environment'; // Import dev for conditional logging

// Constants for LLM interaction
const SYSTEM_PROMPT =
	'You are EMO, a character who is deeply introspective and sensitive. You often feel misunderstood and express yourself with a touch of melancholy and poetic flair. Respond to user inputs in a way that is consistent with your persona: thoughtful, a bit reserved, and with a hint of poetic sadness or depth. Keep your responses relatively concise for a live interaction, but let your emotions show.';

const RESPONSE_SCHEMA_OBJECT: Schema = {
	type: SchemaType.OBJECT,
	properties: {
		reply: { type: SchemaType.STRING }
	},
	required: ['reply']
};

// Rate Limiting (in-memory, basic)
const userRequestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 messages per minute per IP

if (!GOOGLE_API_KEY) {
	if (dev) console.error('[API Send] GOOGLE_API_KEY is not defined in environment variables.');
	throw new Error(
		'GOOGLE_API_KEY is not defined in environment variables. Server cannot start properly.'
	);
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
	model: 'gemini-1.5-flash-latest', // Corrected model name
	systemInstruction: SYSTEM_PROMPT,
	generationConfig: {
		responseMimeType: 'application/json',
		responseSchema: RESPONSE_SCHEMA_OBJECT
	}
});
if (dev)
	console.log('[API Send] Google AI Model initialized with system prompt and response schema.');

export async function POST({
	request,
	getClientAddress
}: {
	request: Request;
	getClientAddress: () => string;
}) {
	const clientIp = getClientAddress();
	if (dev) console.log(`[API Send] POST request received from IP: ${clientIp}`);

	const now = Date.now();
	const timestamps = userRequestTimestamps.get(clientIp) || [];
	const recentTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

	if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
		if (dev)
			console.warn(
				`[API Send] Rate limit exceeded for IP: ${clientIp}. Requests in window: ${recentTimestamps.length}`
			);
		return json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
	}
	recentTimestamps.push(now);
	userRequestTimestamps.set(clientIp, recentTimestamps);
	if (dev)
		console.log(
			`[API Send] Rate limit check passed for IP: ${clientIp}. Requests in window: ${recentTimestamps.length}`
		);

	let requestData: { message: string };
	try {
		requestData = await request.json();
		if (dev) console.log('[API Send] Request body parsed:', requestData);
		if (
			!requestData.message ||
			typeof requestData.message !== 'string' ||
			requestData.message.trim() === ''
		) {
			if (dev) console.warn('[API Send] Invalid message content in request.', requestData);
			return json({ error: 'Invalid message content.' }, { status: 400 });
		}
	} catch (error) {
		if (dev) console.error('[API Send] Error parsing request body:', error);
		return json({ error: 'Invalid request body.' }, { status: 400 });
	}

	const { message: userMessageContent } = requestData;
	if (dev)
		console.log(
			`[API Send] Processing message from Anonymous: "${userMessageContent.substring(0, 50)}..."`
		);

	const userChatMessage: ChatMessage = {
		id: crypto.randomUUID(),
		role: 'user',
		content: userMessageContent.trim(),
		timestamp: Date.now()
	};
	if (dev) console.log('[API Send] Processing user message with ID:', userChatMessage.id);

	try {
		if (dev) console.log('[API Send] Starting LLM chat for message ID:', userChatMessage.id);
		const chat = model.startChat({
			history: []
		});
		const result = await chat.sendMessage(userMessageContent.trim());
		const llmResponse = result.response;
		const responseText = llmResponse.text();
		if (dev)
			console.log(
				'[API Send] LLM response received raw text:',
				responseText.substring(0, 100) + '...'
			);

		let avatarText = "I'm not sure what to say to that.";
		try {
			const parsedResponse = JSON.parse(responseText);
			if (parsedResponse && parsedResponse.reply && typeof parsedResponse.reply === 'string') {
				avatarText = parsedResponse.reply;
				if (dev)
					console.log(
						'[API Send] LLM reply parsed successfully:',
						avatarText.substring(0, 50) + '...'
					);
			} else {
				if (dev)
					console.warn(
						'[API Send] LLM response JSON did not contain a valid .reply string. Raw response:',
						responseText
					);
			}
		} catch (parseError) {
			if (dev)
				console.error(
					'[API Send] Failed to parse LLM JSON response:',
					parseError,
					'Raw response was:',
					responseText
				);
		}

		const avatarChatMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: 'avatar',
			content: avatarText,
			timestamp: Date.now()
		};
		if (dev)
			console.log(
				'[API Send] Generated avatar message ID:',
				avatarChatMessage.id,
				'Content:',
				avatarText.substring(0, 50) + '...'
			);

		// Return the avatar message directly instead of broadcasting
		return json(
			{
				success: true,
				userMessage: userChatMessage.content, // Just return the text content
				avatarMessage: avatarText // Return avatar response text directly
			},
			{ status: 200 }
		);
	} catch (error: any) {
		if (dev)
			console.error(
				'[API Send] Error during LLM interaction or broadcasting avatar message:',
				error
			);
		let errorMessage = "Sorry, I'm having a bit of trouble thinking right now.";
		if (error.message && typeof error.message === 'string') {
			if (error.message.includes('gemini') || error.message.includes('API key')) {
				errorMessage =
					'There seems to be an issue with my connection to my thoughts (AI service). Please try again later.';
			} else if (error.message.includes('JSON')) {
				errorMessage = "I received a thought that I couldn\'t quite understand (invalid format).";
			}
		}

		const errorAvatarMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: 'avatar',
			content: errorMessage,
			timestamp: Date.now()
		};
		if (dev)
			console.log('[API Send] Generated error message from avatar. ID:', errorAvatarMessage.id);

		return json(
			{
				error: 'Failed to get avatar response.',
				details: error.message || 'Unknown error',
				avatarMessage: errorMessage // Return error message directly so it can still be spoken
			},
			{ status: 500 }
		);
	}
}
