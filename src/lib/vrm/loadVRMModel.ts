import { GLTFLoader, type GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { VRM } from '@pixiv/three-vrm';
import type { Object3D } from 'three';

export async function loadVRMModel(modelPath: string): Promise<VRM> {
	const loader = new GLTFLoader();

	loader.register((parser: GLTFParser) => {
		// Ensure VRMUtils.removeUnnecessaryJoints is not called if you are using humanoid bone mapping
		return new VRMLoaderPlugin(parser, { helperRoot: undefined, autoUpdateHumanBones: true });
	});

	const gltf = await loader.loadAsync(modelPath);

	const vrm = gltf.userData.vrm as VRM;

	// Optional: Call this if you don't have texture rotation problems
	// VRMUtils.rotateVRMMaterials(vrm);

	// Disable frustum culling
	vrm.scene.traverse((obj: Object3D) => {
		obj.frustumCulled = false;
	});

	// VRMUtils.removeUnnecessaryJoints(vrm.scene); // Deprecated
	VRMUtils.combineSkeletons(vrm.scene); // Recommended replacement

	return vrm;
}
