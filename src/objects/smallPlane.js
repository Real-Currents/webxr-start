import * as THREE from "three";
import smallPlaneGeometry from "../geometry/smallPlaneGeometry";
import meshMaterial from "../material/meshMaterial";

const smallPlane = new THREE.Mesh(smallPlaneGeometry, meshMaterial);

// Rotate to be horizontal (floor) and lower by 0.5 units
smallPlane.rotateX(-Math.PI / 2);
smallPlane.position.y = 0.0; // Lowered from 0 to -0.5

// Enable shadow receiving
smallPlane.receiveShadow = true;

export default smallPlane;
