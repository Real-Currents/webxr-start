import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky";
import { Water } from "three/addons/objects/Water";

import loadManager from "../loadManager";
import plane from "../objects/plane";
import planeGeometry from "../geometry/planeGeometry";
import rotatingCube from "../objects/rotatingCube";
import rotatingTorus from "../objects/rotatingTorus";

const rotatingMesh = rotatingTorus;
let uniforms, sun, water;

export default async function setupScene (renderer, scene, camera, composer, controllers, player) {

    // Set player view
    player.add(camera);

    // // Get A WebGL context
    // const gl = renderer.getContext();

    sun = new THREE.Vector3();

    // Skybox

    const sky = new Sky();
    sky.scale.setScalar( 10000 );

    const skyUniforms = sky.material.uniforms;

    skyUniforms[ 'turbidity' ].value = 10;
    skyUniforms[ 'rayleigh' ].value = 2;
    skyUniforms[ 'mieCoefficient' ].value = 0.005;
    skyUniforms[ 'mieDirectionalG' ].value = 0.8;

    const parameters = {
        elevation: 2,
        azimuth: 180
    };

    uniforms = {
        // fogDensity: { value: 0.45 },
        // fogColor: { value: new THREE.Vector3( 0, 0, 0 ) },
        // uvScale: { value: new THREE.Vector2( 3.0, 1.0 ) },
        // texture1: { value: cloudTexture },
        // texture2: { value: lavaTexture },
        time: { value: 1.0 },
    };

    rotatingMesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent
    });

    const textureRepeatScale = 1000;
    water = new Water(
        new THREE.PlaneGeometry( 6000, 6000 ),
        {
            distortionScale: 1 / textureRepeatScale,
            fog: scene.fog !== undefined,
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader(loadManager).load( 'material/textures/waternormals.jpg', function ( texture ) {
                texture.repeat.set(textureRepeatScale, textureRepeatScale);
                // texture.repeat.x = textureRepeatScale;
                // texture.repeat.y = textureRepeatScale;
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            } ),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f
        }
    );

    water.rotation.x = - Math.PI / 2;
    water.scale.x = water.scale.x; // / textureRepeatScale;
    water.scale.y = water.scale.y; // / textureRepeatScale;
    water.position.y = -1;

    // Place objects
    scene.add(plane);
    scene.add(sky);
    scene.add(water);
    scene.add(rotatingCube);
    scene.add(rotatingMesh);

    // const pmremGenerator = new THREE.PMREMGenerator( renderer );
    const sceneEnv = new THREE.Scene();

    let renderTarget;

    function updateSun() {

        const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
        const theta = THREE.MathUtils.degToRad( parameters.azimuth );

        sun.setFromSphericalCoords( 1, phi, theta );

        sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
        water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

        if ( renderTarget !== undefined ) renderTarget.dispose();

        sceneEnv.add( sky );
        scene.add( sky );

        // renderTarget = pmremGenerator.fromScene( sceneEnv );
        // scene.environment = renderTarget.texture;

    }

    // Get rayspace from controller object and update position relative to plane (floor)
    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;

        raySpace.getWorldPosition(plane.position);
        raySpace.getWorldQuaternion(plane.quaternion);
    }

    return function (currentSession, delta, time, sceneDataUpdate, sendDOMDataUpdate) {

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

        rotatingMesh.rotX(0.0125 * (5 * delta));
        rotatingMesh.rotY(0.05 * (5 * delta));

        water.material.uniforms[ 'time' ].value += 0.1 / 60.0; // 0.0125 * (5 * delta);

        updateSun();

        if (typeof sceneDataUpdate === "object" && sceneDataUpdate != null) {
            console.log("sceneDataUpdate:", sceneDataUpdate);
        }

        if (typeof sendDOMDataUpdate === "function") {
            const domDataUpdate = {
                data: "data"
            };

            sendDOMDataUpdate(domDataUpdate);
        }
    }
}
