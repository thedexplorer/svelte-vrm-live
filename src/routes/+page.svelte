<script lang="ts">
	import Scene from '$lib/components/Scene.svelte';
	import VRMAvatar from '$lib/components/VRMAvatar.svelte';
	import type { VRM } from '@pixiv/three-vrm';
	import Chat from '$lib/components/Chat.svelte';
	import type { AnimationController } from '$lib/animation/AnimationController.svelte';

	const avatarModelPath = '/models/punk.vrm'; // Ensure avatar.vrm is in static/models

	let vrmInstance = $state<VRM | null>(null);
	let animationController = $state<AnimationController | null>(null);
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-800 text-white">
	<Scene>
		{#snippet children()}
			<VRMAvatar modelPath={avatarModelPath} bind:vrm={vrmInstance} bind:animationController />
		{/snippet}
	</Scene>

	<Chat {vrmInstance} {animationController} />
</div>
