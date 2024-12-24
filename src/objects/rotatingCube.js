import * as THREE from 'three';
import cubeGeometry from "../geometry/cubeGeometry";
import meshMaterials from "../material/meshMaterials";

const rotatingCube = new THREE.Mesh(cubeGeometry, meshMaterials);

rotatingCube.position.y = 2;

rotatingCube.rotX = function (x) {
    // console.log(this);
    this.rotation.x += x;
}

rotatingCube.rotY = function (y) {
    // console.log(this);
    this.rotation.y += y;
}

export default rotatingCube;
