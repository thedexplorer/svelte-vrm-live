<script lang="ts">
	import { browser } from '$app/environment';
	import type { VRM } from '@pixiv/three-vrm';
	import {
		speakWithLipsync,
		lipSyncPresets,
		createLipSyncConfig,
		type Emotion
	} from '$lib/audio/tts';
	import type { ChatMessage } from '$lib/types/chat';
	import type { AnimationController } from '$lib/animation/AnimationController.svelte';
	import type { AnswerWithEmotion } from '$lib/llm/generative';
	import { onMount } from 'svelte';
	import Send from './icons/send.svelte';
	let {
		vrmInstance,
		animationController
	}: {
		vrmInstance: VRM | null;
		animationController: AnimationController | null;
	} = $props();

	let inputText = $state('');
	let chatHistory = $state<ChatMessage[]>([]);
	let isLoadingResponse = $state(false);

	const CHAT_HISTORY_LOCAL_STORAGE_KEY = 'emo_chat_history';
	let chatContainerElement: HTMLDivElement | undefined;

	// Enhanced lip-sync configuration (simplified)
	const lipSyncConfig = createLipSyncConfig({
		...lipSyncPresets.natural,
		debugLogging: true
	});

	// Track speaking state
	let isSpeaking = $state(false);
	let ttsEnabled = $state(true); // Quick toggle to disable TTS entirely

	// Load chat history from localStorage on component mount
	onMount(() => {
		if (browser) {
			const storedHistory = localStorage.getItem(CHAT_HISTORY_LOCAL_STORAGE_KEY);
			if (storedHistory) {
				try {
					chatHistory = JSON.parse(storedHistory);
				} catch (e) {
					console.error('Failed to parse chat history from localStorage:', e);
				}
			}
		}
	});

	// Save chat history to localStorage
	$effect(() => {
		// if (browser) {
		// 	localStorage.setItem(CHAT_HISTORY_LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
		// }

		// Scroll to bottom when chat history changes
		const element = chatContainerElement;
		if (element) {
			Promise.resolve().then(() => {
				element.scrollTop = element.scrollHeight;
			});
		}
	});

	async function handleSpeak() {
		if (inputText.trim() && vrmInstance && !isLoadingResponse) {
			const userMessageContent = inputText;

			inputText = '';
			isLoadingResponse = true;

			// Add user message to chat history immediately
			const userMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'user',
				content: userMessageContent,
				timestamp: Date.now()
			};
			chatHistory = [...chatHistory, userMessage];

			try {
				// Use our new generate API that includes emotion
				const apiResponse = await fetch('/api/generate', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						systemInstruction:
							'You are EMO, a character who is deeply introspective and sensitive. You often feel misunderstood and express yourself with a touch of melancholy and poetic flair. Respond to user inputs in a way that is consistent with your persona: thoughtful, a bit reserved, and with a hint of poetic sadness or depth. Keep your responses relatively concise for a live interaction, but let your emotions show.',
						prompt: userMessageContent
					})
				});

				if (!apiResponse.ok) {
					const errorData = await apiResponse
						.json()
						.catch(() => ({ message: apiResponse.statusText }));
					throw new Error(`API Error ${apiResponse.status}: ${errorData.message}`);
				}

				const responseData = (await apiResponse.json()) as AnswerWithEmotion;

				// Add avatar response to chat and speak it
				if (responseData.answer) {
					const avatarMessage: ChatMessage = {
						id: crypto.randomUUID(),
						role: 'avatar',
						content: responseData.answer,
						timestamp: Date.now()
					};
					chatHistory = [...chatHistory, avatarMessage];

					// Start talking animation with emotion
					if (animationController) {
						animationController.startTalking(responseData.emotion as Emotion);
					}

					// Speak the response with TTS (only if enabled and not already speaking)
					if (ttsEnabled && !isSpeaking && vrmInstance) {
						isSpeaking = true;
						console.log(
							`[Chat] Starting TTS for response with emotion ${responseData.emotion}:`,
							avatarMessage.content.substring(0, 30) + '...'
						);

						speakWithLipsync(
							avatarMessage.content,
							vrmInstance,
							lipSyncConfig,
							responseData.emotion as Emotion
						).finally(() => {
							isSpeaking = false;
							console.log('[Chat] TTS completed');
							// Stop talking animation and return to idle state smoothly
							if (animationController) {
								animationController.stopTalking();
							}
						});
					}
				}
			} catch (error) {
				console.error('Error generating response:', error);

				// Use default error message since we can't access the response in catch block
				let errorMessage = "Sorry, I'm having trouble thinking right now.";

				const errorAvatarMessage: ChatMessage = {
					id: crypto.randomUUID(),
					role: 'avatar',
					content: errorMessage,
					timestamp: Date.now()
				};
				chatHistory = [...chatHistory, errorAvatarMessage];

				// Start neutral talking animation for error
				if (animationController) {
					await animationController.startTalking('neutral' as Emotion);
				}

				// Speak error message if TTS is enabled
				if (ttsEnabled && !isSpeaking && vrmInstance) {
					isSpeaking = true;
					console.log(
						'[Chat] Starting TTS for error message:',
						errorMessage.substring(0, 30) + '...'
					);

					speakWithLipsync(errorMessage, vrmInstance, lipSyncConfig, 'neutral' as Emotion).finally(
						() => {
							isSpeaking = false;
							console.log('[Chat] TTS completed');
							// Stop talking animation and return to idle state smoothly
							if (animationController) {
								animationController.stopTalking();
							}
						}
					);
				}
			} finally {
				isLoadingResponse = false;
			}
		}
	}
</script>

<div
	class="fixed -right-14 bottom-5 flex max-h-[80vh] w-[600px] flex-col items-center justify-center"
>
	<!-- Chat display area -->
	<div
		bind:this={chatContainerElement}
		class="mt-4 flex min-h-[24vh] w-full max-w-md flex-col overflow-y-auto rounded-lg bg-gray-700 p-4"
	>
		{#each chatHistory as message}
			<span
				class={`mb-2 inline-block max-w-[80%] rounded-lg px-3 py-1 ${message.role === 'user' ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-600 text-white'}`}
			>
				{message.content}
			</span>
		{/each}
		{#if isLoadingResponse}
			<div class="mb-2 text-left">
				<span class="inline-block rounded-lg bg-gray-600 px-3 py-1 text-white italic">
					EMO is pondering...
				</span>
			</div>
		{/if}
	</div>

	<div class="relative mt-4 flex w-full max-w-md items-center gap-2">
		<textarea
			bind:value={inputText}
			placeholder="Type your message to EMO..."
			class="flex-1 rounded-lg bg-gray-700 px-2 py-2 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			onkeydown={(e) => e.key === 'Enter' && handleSpeak()}
			disabled={isLoadingResponse}
			rows={2}
		/>

		<button
			onclick={handleSpeak}
			class="absolute right-2 rounded-lg bg-blue-500 px-2 py-1.5 font-semibold text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
			disabled={isLoadingResponse}
		>
			<Send />
		</button>
	</div>
</div>
