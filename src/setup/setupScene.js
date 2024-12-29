import * as THREE from "three";

// import loadManager from "../loadManager";
import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";
import rotatingTorus from "../objects/rotatingTorus";

const rotatingMesh = rotatingTorus;
let uniforms, mesh;

const SIZE = 4;
const RESOLUTION = 256;

export default async function setupScene (renderer, scene, camera, composer, controllers, player) {

    // Set player view
    player.add(camera);

    // // Get A WebGL context
    // const gl = renderer.getContext();

    uniforms = {
        ...THREE.ShaderLib.physical.uniforms,
        // diffuse: { value: "#5B82A6" }, // <= DO NO USE WITH THREE.ShaderChunk.meshphysical_frag ...
// #include <lights_physical_fragment> 	// Uncaught TypeError:
// WebGL2RenderingContext.uniform3fv: Argument 2 could not be converted to any of: Float32Array, sequence<unrestricted float>.
//    setValueV3f three.module.js:18471
//    upload three.module.js:19376
//    setProgram three.module.js:31008
//    renderBufferDirect three.module.js:29615
//    renderObject three.module.js:30492
//    renderObjects three.module.js:30461
//    renderScene three.module.js:30310
//    render three.module.js:30128
//    ...
// #include <lights_fragment_begin>
// #include <lights_fragment_maps>
// #include <lights_fragment_end>  		// SHADER_INFO_LOG:
//     ERROR: 0:1764: 'material' : undeclared identifier
//     ERROR: 0:1764: 'RE_IndirectDiffuse_Physical' : no matching overloaded function found
//     ERROR: 0:1767: 'material' : undeclared identifier
//     ERROR: 0:1767: 'RE_IndirectSpecular_Physical' : no matching overloaded function found
//
//     FRAGMENT
//
//     ERROR: 0:1764: 'material' : undeclared identifier
//     ERROR: 0:1764: 'RE_IndirectDiffuse_Physical' : no matching overloaded function found
//     ERROR: 0:1767: 'material' : undeclared identifier
//     ERROR: 0:1767: 'RE_IndirectSpecular_Physical' : no matching overloaded function found
//
//       1759: 	#ifdef USE_CLEARCOAT
//       1760: 		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
//       1761: 	#endif
//       1762: #endif
//       1763: #if defined( RE_IndirectDiffuse )
//     > 1764: 	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
//       1765: #endif
//       1766: #if defined( RE_IndirectSpecular )
//       1767: 	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
//       1768: #endif
//       1769: //				#include <aomap_fragment>
//       1770: //				vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse; three.module.js:20346:13
//         onFirstUse (js stack)
//         ...
//         ...
//				#include <aomap_fragment>
//				vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
//				vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
//				#include <transmission_fragment>
//				vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
//				#ifdef USE_SHEEN
//					float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
//					outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
//				#endif
//				#ifdef USE_CLEARCOAT
//					float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
//					vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
//					outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
//				#endif
//				#include <opaque_fragment>
//				#include <tonemapping_fragment>
//				#include <colorspace_fragment>
//				#include <fog_fragment>
//				#include <premultiplied_alpha_fragment>
//				#include <dithering_fragment>

        roughness: { value: 0.5 },
        amplitude: { value: 0.4},
        frequency: { value: 0.5 },
        speed: { value: 0.3 },
        // fogDensity: { value: 0.45 },
        // fogColor: { value: new THREE.Vector3( 0, 0, 0 ) },
        // uvScale: { value: new THREE.Vector2( 3.0, 1.0 ) },
        // texture1: { value: cloudTexture },
        // texture2: { value: lavaTexture },
        time: { value: 1.0 }
    };

    rotatingMesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent
    });

    const geometry = new THREE.PlaneGeometry(SIZE, SIZE, RESOLUTION, RESOLUTION);

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: // THREE.ShaderChunk.meshphysical_vert,
        document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: // THREE.ShaderChunk.meshphysical_frag,
        document.getElementById( 'fragmentShader' ).textContent,
        lights: true,
        side: THREE.DoubleSide,
        defines: {
            STANDARD: '',
            PHYSICAL: '',
        },
        extensions: {
            derivatives: true,
        },
    });

    plane.geometry = geometry;
    plane.material = material;

    plane.rotation.x = -(Math.PI / 2);

    // Place objects
    scene.add(plane);
    scene.add(rotatingCube);
    scene.add(rotatingMesh);

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
