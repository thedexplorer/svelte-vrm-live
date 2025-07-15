<script lang="ts">
	import { OrbitControls } from '@threlte/extras';
</script>

<!-- Camera settings -->
<OrbitControls
	enableDamping={true}
	maxDistance={7}
	minAzimuthAngle={Math.PI / 1.1}
	maxAzimuthAngle={-Math.PI / 1.1}
	minPolarAngle={Math.PI / 5}
	maxPolarAngle={Math.PI / 2.5}
	minDistance={3.5}
/>
