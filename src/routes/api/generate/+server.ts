import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';
import { generateAnswerWithEmotion } from '$lib/llm/generative'; // Ensure this path is correct

// Basic interface for the expected request body.
// You should refine this based on the actual structure of 'schema'.
interface GenerateRequestBody {
	systemInstruction: string;
	prompt: string;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!env.GOOGLE_API_KEY) {
		console.error('GOOGLE_API_KEY is not set in environment variables.');
		throw error(500, 'API key not configured. Please check server logs.');
	}

	let requestData: GenerateRequestBody;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, 'Invalid request body: Must be valid JSON.');
	}

	const { systemInstruction, prompt } = requestData; // Removed schema

	if (!systemInstruction || !prompt) {
		// Removed schema check
		throw error(
			400,
			'Missing required fields: systemInstruction and prompt are required.' // Updated error message
		);
	}

	const genAIInstance = new GoogleGenerativeAI(env.GOOGLE_API_KEY);

	try {
		const result = await generateAnswerWithEmotion(genAIInstance, systemInstruction, prompt);
		console.log('Generated answer with emotion:', result);
		return json(result);
	} catch (e: any) {
		console.error('Error generating structured output:', e);
		// Provide a more generic error to the client for security
		throw error(500, `Failed to generate content: ${e.message || 'Internal Server Error'}`);
	}
};
