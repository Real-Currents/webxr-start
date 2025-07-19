import * as THREE from "three";

// Red metallic material based on Blender scene data
// Blender material properties: Base Color (0.8, 0.1, 0.1), Metallic: 1.0, Roughness: 0.2
const redMetallicMaterial = new THREE.MeshStandardMaterial({
    color: 0xCC1A1A,        // Red color matching Blender (0.8, 0.1, 0.1)
    metalness: 1.0,         // Full metallic
    roughness: 0.2,         // Low roughness for shine
    envMapIntensity: 1.0,   // Environment reflection intensity
});

export default redMetallicMaterial;
