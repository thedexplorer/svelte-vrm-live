export interface ChatMessage {
	id: string; // Unique ID, e.g., crypto.randomUUID()
	role: 'user' | 'avatar';
	content: string;
	timestamp: number; // e.g., Date.now()
}
