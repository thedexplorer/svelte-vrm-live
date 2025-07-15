<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	import { type VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
	import { loadVRMModel } from '$lib/vrm/loadVRMModel';
	import { Clock, Mesh } from 'three';

	import {
		AnimationController,
		type AnimationPaths
	} from '$lib/animation/AnimationController.svelte';
	import { onMount } from 'svelte';

	let {
		modelPath = '/models/avatar.vrm',
		vrm = $bindable<VRM | null>(null),
		animationController = $bindable<AnimationController | null>(null)
	}: {
		modelPath?: string;
		vrm?: VRM | null;
		animationController?: AnimationController | null;
	} = $props();

	const animationPaths: AnimationPaths = {
		angry: ['/animations/talking-angry.fbx', '/animations/talking-arguing.fbx'],
		neutral: ['/animations/talking-neutral-1.fbx', '/animations/talking-neutral-2.fbx'],
		happy: ['/animations/talking-happy.fbx'],
		funny: ['/animations/talking-funny.fbx'],
		idle: [
			'/animations/idle.fbx',
			'/animations/idle-1.fbx',
			'/animations/idle-2.fbx',
			'/animations/idle-3.fbx'
		]
	};

	const clock = new Clock();
	const { scene: threlteScene } = useThrelte();

	onMount(() => {
		async function initVRMAndAnimation() {
			try {
				const loadedVRM = await loadVRMModel(modelPath);
				vrm = loadedVRM;
				console.log('[VRMAvatar] VRM loaded:', loadedVRM);

				if (loadedVRM.scene) {
					// Ensure meshes within the VRM model cast shadows and adjust ShaderMaterials
					loadedVRM.scene.traverse((child) => {
						if ((child as Mesh).isMesh) {
							const mesh = child as Mesh;
							mesh.castShadow = true;
							mesh.receiveShadow = true; // Default to true for most meshes
						}
					});

					// Initialize animation controller
					animationController = new AnimationController(loadedVRM, animationPaths);
					console.log('[VRMAvatar] AnimationController initialized');
				}
			} catch (error) {
				console.error('[VRMAvatar] Failed to load VRM model:', error);
				vrm = null;
			}
		}
		initVRMAndAnimation();
	});

	$effect(() => {
		if (vrm) {
			const vrmInstance = vrm; // Capture reactive value for the effect
			const currentThrelteScene = threlteScene;

			if (vrmInstance?.scene && currentThrelteScene) {
				const modelScene = vrmInstance.scene;
				currentThrelteScene.add(modelScene);
				// Avatar position
				modelScene.position.set(-0.5, -0.5, -2.2); // Adjusted position
				modelScene.rotation.set(0, 0.2, 0);
				modelScene.scale.set(1, 1, 1);

				return () => {
					if (currentThrelteScene.children.includes(modelScene)) {
						currentThrelteScene.remove(modelScene);
					}
					// Clean up animation controller
					if (animationController) {
						animationController.destroy();
					}
				};
			}
		}
	});

	let blinkState = $state(false);
	let lastBlinkTime = $state(0);
	let nextBlinkInterval = $state(2 + Math.random() * 5);

	useTask((delta: number) => {
		if (!vrm?.scene || !vrm.humanoid) return;

		const elapsedTime = clock.getElapsedTime();

		// Update animation controller
		if (animationController) {
			animationController.update(delta);
		}

		// Blinking and Expression Cycling can happen regardless of primary animation (VRMA or embedded)
		// but consider if they should be disabled if a VRMA controls expressions.
		if (vrm.expressionManager && elapsedTime - lastBlinkTime > nextBlinkInterval) {
			// Added !vrmaAction
			blinkState = true;
			vrm.expressionManager.setValue(VRMExpressionPresetName.Blink, 1);

			setTimeout(() => {
				if (vrm && vrm.expressionManager) {
					vrm.expressionManager.setValue(VRMExpressionPresetName.Blink, 0);
				}
				blinkState = false;
				lastBlinkTime = elapsedTime;
				nextBlinkInterval = 2 + Math.random() * 5;
			}, 150);
		}

		// VRM internal updates
		if (vrm) {
			vrm.update(delta);
		}

		// Force update of model's world matrix after all manipulations
		if (vrm?.scene) {
			vrm.scene.updateMatrixWorld(true);
		}
	});
</script>
