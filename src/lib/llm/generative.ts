import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { sleep } from '$lib/utils/sleep';

const emotions = ['angry', 'happy', 'neutral', 'funny'];

export interface AnswerWithEmotion {
	answer: string;
	emotion: (typeof emotions)[number];
}

// OpenAPI schema for the AnswerWithEmotion structure
const answerEmotionSchema = {
	type: 'object',
	properties: {
		answer: {
			type: 'string',
			description: 'The textual answer to the prompt.'
		},
		emotion: {
			type: 'string',
			enum: emotions,
			description: `The dominant emotion conveyed in the answer (${emotions.join(', ')}).`
		}
	},
	required: ['answer', 'emotion']
};

export async function generateStructuredOutput(
	generativeAIInstance: GoogleGenerativeAI,
	systemInstruction: string,
	prompt: string,
	schema: any,
	maxRetries = 10
): Promise<string> {
	const model = generativeAIInstance.getGenerativeModel({
		model: 'gemini-2.0-flash',
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: schema,
			maxOutputTokens: 64000
		},
		systemInstruction
	});

	let lastError;
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const result = await model.generateContent(prompt);
			return result.response.text();
		} catch (error: any) {
			lastError = error;
			if (error && typeof error === 'object' && 'status' in error && error.status === 503) {
				const backoffTime = Math.pow(2, attempt) * 5000;
				console.log(
					`Service unavailable. Retrying in ${backoffTime / 1000} seconds... (Attempt ${
						attempt + 1
					}/${maxRetries})`
				);
				await sleep(backoffTime);
				continue;
			}
			throw error;
		}
	}

	if (lastError) {
		throw lastError;
	} else {
		throw new Error(
			'Failed to generate structured output after multiple retries without a specific error.'
		);
	}
}

export async function generateAnswerWithEmotion(
	generativeAIInstance: GoogleGenerativeAI,
	systemInstruction: string,
	prompt: string,
	maxRetries?: number
): Promise<AnswerWithEmotion> {
	const modifiedSystemInstruction = `${systemInstruction} When determining the emotion for your answer, consider the sentiment of the user's prompt. For example, if the user's prompt is aggressive, negative, or insulting, your answer's emotion should reflect an appropriate response, such as 'angry'. Conversely, if the prompt is positive or inquisitive, choose a corresponding emotion.`;
	const resultText = await generateStructuredOutput(
		generativeAIInstance,
		modifiedSystemInstruction,
		prompt,
		answerEmotionSchema,
		maxRetries
	);
	return JSON.parse(resultText) as AnswerWithEmotion;
}
