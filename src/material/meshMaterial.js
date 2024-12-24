import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load( 'material/textures/wall.jpg' );
texture.colorSpace = THREE.SRGBColorSpace

const meshMaterial = new THREE.MeshBasicMaterial({ // new MeshStandardNodeMaterial({
    // color: 0x00FF00,
    map: texture,
    opacity: 1.0,
    side: THREE.DoubleSide,
    // transparent: true,
    // alphaTest: 0.025
});

export default meshMaterial;
