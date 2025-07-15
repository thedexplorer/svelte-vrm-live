import type { VRM } from '@pixiv/three-vrm';
import { AnimationMixer, type AnimationAction, LoopRepeat, LoopOnce } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { remapMixamoAnimationToVrm } from '$lib/mixamo/remapMixamoAnimationToVrm';
import type { Emotion } from '$lib/audio/tts';

export type AnimationState = 'idle' | 'talking';

export interface AnimationPaths {
	angry: string[];
	neutral: string[];
	happy: string[];
	funny: string[];
	idle: string[];
}

export class AnimationController {
	private vrm: VRM;
	private mixer: AnimationMixer;
	private fbxLoader: FBXLoader;
	private currentAction: AnimationAction | null = null;
	private currentState: AnimationState = 'idle';
	private animationPaths: AnimationPaths;
	private transitionTimeout: number | null = null;

	constructor(vrm: VRM, animationPaths: AnimationPaths) {
		this.vrm = vrm;
		this.mixer = new AnimationMixer(vrm.scene);
		this.fbxLoader = new FBXLoader();
		this.animationPaths = animationPaths;
		this.startIdleAnimation();
	}

	private async startIdleAnimation() {
		try {
			const idlePaths = this.animationPaths.idle;
			if (idlePaths.length > 0) {
				const randomIdlePath = idlePaths[Math.floor(Math.random() * idlePaths.length)];
				await this.playAnimation(randomIdlePath, true);
			}
		} catch (error) {
			console.warn('[AnimationController] Failed to start idle animation:', error);
		}
	}

	private async playAnimation(animationPath: string, loop: boolean = false): Promise<void> {
		try {
			console.log(`[AnimationController] Request to play: ${animationPath}, loop: ${loop}`);
			const fbxModel = await this.fbxLoader.loadAsync(animationPath);

			if (!fbxModel.animations || fbxModel.animations.length === 0) {
				console.warn(`[AnimationController] No animations in FBX: ${animationPath}`);
				return;
			}

			const remappedClip = remapMixamoAnimationToVrm(this.vrm, fbxModel);
			if (!remappedClip) {
				console.warn(`[AnimationController] Failed to remap: ${animationPath}`);
				return;
			}

			const newAction = this.mixer.clipAction(remappedClip);
			if (loop) {
				newAction.setLoop(LoopRepeat, Infinity);
			} else {
				newAction.setLoop(LoopOnce, 1);
				newAction.clampWhenFinished = true;
			}

			const oldAction = this.currentAction;
			this.currentAction = newAction;

			if (oldAction) {
				if (oldAction.getClip() === newAction.getClip() && oldAction !== newAction) {
					oldAction.stop();
					this.mixer.uncacheAction(oldAction.getClip(), this.vrm.scene);
					console.log(
						`[AnimationController] Stopped duplicate old action for clip: ${remappedClip.name}`
					);
					newAction.reset().play();
				} else if (oldAction !== newAction) {
					console.log(
						`[AnimationController] Crossfading from ${oldAction.getClip().name} to ${newAction.getClip().name}`
					);

					if (!oldAction.isRunning()) {
						oldAction.reset().play();
					}

					newAction.play();
					oldAction.crossFadeTo(newAction, 0.3, false);

					setTimeout(() => {
						oldAction.stop();
						this.mixer.uncacheAction(oldAction.getClip(), this.vrm.scene);
						console.log(`[AnimationController] Cleaned up old action: ${oldAction.getClip().name}`);
					}, 300);
				} else {
					console.log(
						`[AnimationController] Resetting and playing same action instance: ${remappedClip.name}`
					);
					newAction.reset().play();
				}
			} else {
				console.log(`[AnimationController] Playing initial animation: ${remappedClip.name}`);
				newAction.reset().play();
			}
		} catch (error) {
			console.error(`[AnimationController] Error playing animation ${animationPath}:`, error);
			if (this.currentAction) {
				this.currentAction.stop();
			}
			this.currentAction = null;
		}
	}

	async startTalking(emotion?: Emotion): Promise<void> {
		if (this.transitionTimeout) {
			clearTimeout(this.transitionTimeout);
			this.transitionTimeout = null;
		}

		if (this.currentState === 'talking') return;

		this.currentState = 'talking';
		console.log('[AnimationController] startTalking: Transitioning to talking state.');
		await this.playTalkingAnimation(emotion || 'neutral');
	}

	private async playTalkingAnimation(emotion: Emotion): Promise<void> {
		let animationPaths: string[];

		switch (emotion) {
			case 'angry':
				animationPaths = this.animationPaths.angry;
				break;
			case 'happy':
				animationPaths = this.animationPaths.happy;
				break;
			case 'funny':
				animationPaths = this.animationPaths.funny;
				break;
			default:
				animationPaths = this.animationPaths.neutral;
		}

		if (animationPaths.length > 0) {
			const randomPath = animationPaths[Math.floor(Math.random() * animationPaths.length)];
			await this.playAnimation(randomPath, true);
		}
	}

	async stopTalking(): Promise<void> {
		if (this.currentState !== 'talking') return;
		if (this.transitionTimeout) return;

		console.log('[AnimationController] stopTalking: Queuing transition to idle state.');
		this.transitionTimeout = window.setTimeout(async () => {
			if (this.currentState === 'talking') {
				this.currentState = 'idle';
				console.log('[AnimationController] stopTalking: Executing transition to idle state.');
				await this.startIdleAnimation();
			}
			this.transitionTimeout = null;
		}, 200);
	}

	update(deltaTime: number): void {
		this.mixer.update(deltaTime);
	}

	getCurrentState(): AnimationState {
		return this.currentState;
	}

	destroy(): void {
		if (this.transitionTimeout) {
			clearTimeout(this.transitionTimeout);
		}
		if (this.currentAction) {
			this.currentAction.stop();
		}
	}
}
