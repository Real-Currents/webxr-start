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

const SIZE = 4;
const RESOLUTION = 256;

//------------------------
// Shaders and util functions from:
// https://codepen.io/marco_fugaro/pen/xxZWPWJ?editors=0010
//------------------------

// from https://github.com/hughsk/glsl-noise/blob/master/simplex/3d.glsl
const noise_shader = `
//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float noise(vec3 v)
  {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }
`;

const vertex_shader = `
  uniform float time;
  uniform float amplitude;
  uniform float speed;
  uniform float frequency;

  ${noise_shader}
  
  // the function which defines the displacement
  float displace(vec3 point) {
    return noise(vec3(point.x * frequency, point.z * frequency, time * speed)) * amplitude;
  }
  
  // http://lolengine.net/blog/2013/09/21/picking-orthogonal-vector-combing-coconuts
  vec3 orthogonal(vec3 v) {
    return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0)
    : vec3(0.0, -v.z, v.y));
  }
  
  void main() {
    vec3 displacedPosition = position + normal * displace(position);
    
    
    float offset = ${SIZE / RESOLUTION};
    vec3 tangent = orthogonal(normal);
    vec3 bitangent = normalize(cross(normal, tangent));
    vec3 neighbour1 = position + tangent * offset;
    vec3 neighbour2 = position + bitangent * offset;
    vec3 displacedNeighbour1 = neighbour1 + normal * displace(neighbour1);
    vec3 displacedNeighbour2 = neighbour2 + normal * displace(neighbour2);
    
    // https://i.ya-webdesign.com/images/vector-normals-tangent-16.png
    vec3 displacedTangent = displacedNeighbour1 - displacedPosition;
    vec3 displacedBitangent = displacedNeighbour2 - displacedPosition;
    
    // https://upload.wikimedia.org/wikipedia/commons/d/d2/Right_hand_rule_cross_product.svg
    vec3 displacedNormal = normalize(cross(displacedTangent, displacedBitangent));

  }
`;

export default function setupScene (renderer, scene, camera, composer, controllers, player) {

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

    // console.log(THREE.ShaderChunk.meshphysical_vert);
    // console.log(THREE.ShaderChunk.meshphysical_frag);

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
