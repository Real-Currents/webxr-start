import * as THREE from "three";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import setupScene from "./setup/setupScene";

import defaultVertexShader from './shaders/default/vertexShader.glsl';
import portalFragmentShader from './shaders/portal/fragmentShader.glsl';

let currentSession;

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const controllerModelFactory = new XRControllerModelFactory();
const controllers = {
    left: null,
    right: null,
};

let waiting_for_confirmation = false;

// Setup clipping planes
const globalPlaneInside = [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)];
const globalPlaneOutside = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];

let isInsidePortal = true; // false;

const sceneContainer = new THREE.Group();

const mapLayers = new Map();
mapLayers.set("inside", 1);
mapLayers.set("outside", 2);
mapLayers.set("portal", 3);

// Helper function to set nested meshes to layers
// https://github.com/mrdoob/three.js/issues/10959
function setLayer(object, layer) {
    object.layers.set(layer);
    object.traverse(function (child) {
        child.layers.set(layer);
    });
}

async function initScene (setup = (scene, camera, controllers, players, mapLayers, setLayer) => {}) {

    // iwer setup
    let nativeWebXRSupport = false;

    if (navigator.xr) {
        nativeWebXRSupport = await (navigator.xr.isSessionSupported('immersive-ar')
            || navigator.xr.isSessionSupported('immersive-vr'));
    }

    // Setup Immersive Web Emulation Runtime (iwer) and emulated XR device (@iwer/devui)
    if (!nativeWebXRSupport) {
        const xrDevice = new XRDevice(metaQuest3);
        xrDevice.installRuntime();
        xrDevice.fovy = (75 / 180) * Math.PI;
        xrDevice.ipd = 0;
        window.xrdevice = xrDevice;
        xrDevice.controllers.right.position.set(0.15649, 1.43474, -0.38368);
        xrDevice.controllers.right.quaternion.set(
            0.14766305685043335,
            0.02471366710960865,
            -0.0037767395842820406,
            0.9887216687202454,
        );
        xrDevice.controllers.left.position.set(-0.15649, 1.43474, -0.38368);
        xrDevice.controllers.left.quaternion.set(
            0.14766305685043335,
            0.02471366710960865,
            -0.0037767395842820406,
            0.9887216687202454,
        );
        new DevUI(xrDevice);

    }

    const player = new THREE.Group();
    scene.add(player);

    const previewWindow = {
        width: window.innerWidth / 2, // 640,
        height: window.innerHeight + 10, // 480,
    };

    const body = document.body,
        container = document.createElement('div');
    container.style = `display: inline-block; background-color: #000; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
    body.appendChild(container);

    console.log(container);

    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(previewWindow.width, previewWindow.height);
    renderer.xr.enabled = true;
    renderer.localClippingEnabled = true;

    const renderTarget = renderer.getRenderTarget();

    console.log(renderTarget);

    container.appendChild(renderer.domElement);

    function resizeRenderer(width, height) {
        renderer.setSize(width, height);
    }

    const portalRenderTarget = new THREE.WebGLRenderTarget(1, 1);

    function resizePortalRenderTarget(width, height) {
        portalRenderTarget.setSize(width, height);
    }

    resizePortalRenderTarget(previewWindow.width, previewWindow.height);

    const resolution = new THREE.Vector2();

    const camera = new THREE.PerspectiveCamera(
        50,
        previewWindow.width / previewWindow.height,
        0.1,
        100,
    );
    camera.position.set(0, 1.6, 3);

    // const controls = new OrbitControls(camera, container);
    // controls.target.set(0, 1.6, 0);
    // controls.update();

    const cameraLookAtTarget = new THREE.Vector3(0, 0.5, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableZoom = false;
    // controls.enablePan = false;
    controls.target = cameraLookAtTarget;
    controls.update();

    console.log(renderer.domElement);

    container.appendChild(renderer.domElement);

    function onWindowResize() {
        camera.aspect = previewWindow.width / previewWindow.height;
        camera.updateProjectionMatrix();

        renderer.setSize(previewWindow.width, previewWindow.height);
    }

    window.addEventListener('resize', onWindowResize);

    for (let i = 0; i < 2; i++) {
        const raySpace = renderer.xr.getController(i);
        const gripSpace = renderer.xr.getControllerGrip(i);
        const mesh = controllerModelFactory.createControllerModel(gripSpace);

        gripSpace.add(mesh);

        gripSpace.addEventListener('connected', (e) => {

            raySpace.visible = true;
            gripSpace.visible = true;
            const handedness = e.data.handedness;
            controllers[handedness] = {
                gamepad: new GamepadWrapper(e.data.gamepad),
                raySpace,
                gripSpace,
                mesh,
            };
        });

        gripSpace.addEventListener('disconnected', (e) => {
            raySpace.visible = false;
            gripSpace.visible = false;
            const handedness = e.data.handedness;
            controllers[handedness] = null;
        });

        player.add(raySpace, gripSpace);
        // raySpace.visible = false;
        // gripSpace.visible = false;
    }

    // Portal code from:
    //   https://medium.com/@petercoolen/breaking-down-the-portal-effect-how-to-create-an-immersive-ar-experience-9654aa882c13

    // Adaptation of portal example from
    //   [Breaking Down the Portal Effect: How to Create an Immersive AR Experience](https://medium.com/@petercoolen/breaking-down-the-portal-effect-how-to-create-an-immersive-ar-experience-9654aa882c13)
    //   Code: https://codepen.io/Qubica/pen/bGjRLXP
    // ... BUT, one thing that is very different is that the "inside"/"outside" boundaries, which
    // are hardcoded directional vectors) have to be swapped for WebXR; I don't know why...
    const portalCanvas = document.createElement('canvas');
    document.body.append(portalCanvas);
    const ctx = portalCanvas
        // .getContext('2d');
        .getContext("webgl2");
    const texture = new THREE.CanvasTexture(portalCanvas);

    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;

    // ctx.fillStyle = "transparent";
    // ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    //
    // function randInt(min, max) {
    //     if (max === undefined) {
    //         max = min;
    //         min = 0;
    //     }
    //     return Math.random() * (max - min) + min | 0;
    // }
    //
    // function drawRandomDot() {
    //     ctx.strokeStyle = `#${randInt(0x1000000).toString(16).padStart(6, '0')}`;
    //     ctx.fillStyle = `#${randInt(0x1000000).toString(16).padStart(6, '0')}`;
    //     ctx.beginPath();
    //
    //     const x = randInt(ctx.canvas.width);
    //     const y = randInt(ctx.canvas.height);
    //     const radius = randInt(10, 64);
    //     ctx.arc(x, y, radius, 0, Math.PI * 2);
    //     ctx.stroke();
    //     ctx.fill();
    // }
    //
    // for (let i = 0; i < 1000; i++) {
    //     drawRandomDot();
    // }

    const portalRenderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: portalCanvas,
    });
    portalRenderer.setPixelRatio(window.devicePixelRatio);
    portalRenderer.setSize(previewWindow.width, previewWindow.height);
    portalRenderer.xr.enabled = false;
    portalRenderer.localClippingEnabled = false;

    function createPortal(size) {
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({ // new THREE.ShaderMaterial({
            // map: portalRenderTarget.texture || texture,
            map: texture,
            opacity: 1.0,
            side: THREE.DoubleSide,
            // uniforms: {
            //     ...THREE.ShaderLib.physical.uniforms,
            //     diffuse: { value: { "r": 0.36, "g": 0.51, "b": 0.65 } },
            //     roughness: { value: 0.5 },
            //     amplitude: { value: 0.25},
            //     frequency: { value: 0.5 },
            //     speed: { value: 0.3 },
            //     time: { value: 1.0 }
            // },
            // vertexShader: defaultVertexShader,
            // fragmentShader: portalFragmentShader,
        });

//         material.onBeforeCompile = (shader) => {
//             shader.uniforms.uResolution = new THREE.Uniform(resolution);
//
//             shader.vertexShader = defaultVertexShader;
//
//             console.log("VertexShader:\n" + shader.vertexShader);
//
//             shader.fragmentShader = `
//     uniform vec2 uResolution;
// ` + shader.fragmentShader;
//
//             shader.fragmentShader = shader.fragmentShader.replace(
//                 "#include <map_fragment>", `
//     vec2 pos = gl_FragCoord.xy/uResolution;
//     vec4 sampledDiffuseColor = texture2D( map, pos );
//     diffuseColor *= sampledDiffuseColor;
// `);
//
//             shader.fragmentShader = shader.fragmentShader.replace(
//                 "#include <dithering_fragment>",
//                 "#include <dithering_fragment>" + `
//     // gl_FragColor = vec4(1, 0, 0, 1);
//     // gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1);
//     // gl_FragColor = diffuseColor;
//     gl_FragColor = diffuseColor * vec4(vNormal * 0.5 + 0.5, 1);
// `);
//             console.log("FragmentShader:\n" + shader.fragmentShader);
//         };

        // geometry.rotateY(-Math.PI);

        return new THREE.Mesh(geometry, material);
    }

    const portalRadialBounds = 1.0; // relative to portal size

    const portalMesh = createPortal(portalRadialBounds * 2);
    portalMesh.position.set(0, 1.2, 0);
    setLayer(portalMesh, mapLayers.get("portal"));
    sceneContainer.add(portalMesh);

    const environment = new RoomEnvironment(renderer);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(environment).texture; // <= light + texture for quest controllers

    const updateScene = await setup(sceneContainer, camera, controllers, player, mapLayers, setLayer);

    scene.add(sceneContainer);

    function renderPortal (sceneObjects) {
        // portalRenderer.clippingPlanes = isInsidePortal
        //     ? globalPlaneInside
        //     : globalPlaneOutside;

        // sceneObjects.forEach(m => {
        //     if (m.hasOwnProperty("material") && m.material.hasOwnProperty("clippingPlanes")) {
        //         m.material.clippingPlanes = isInsidePortal
        //             ? globalPlaneInside
        //             : globalPlaneOutside;
        //     }
        // });

        camera.layers.disable(mapLayers.get("portal"));
        // if (isInsidePortal) {
        //     camera.layers.disable(mapLayers.get("inside"));
            camera.layers.enable(mapLayers.get("outside"));
        // } else {
        //     camera.layers.disable(mapLayers.get("outside"));
            camera.layers.enable(mapLayers.get("inside"));
        // }

        portalRenderer.setRenderTarget(null);
        portalRenderer.render(scene, camera);
        texture.needsUpdate = true;
        portalRenderer.setRenderTarget(portalRenderTarget);
        portalRenderer.clear();
        portalRenderer.render(scene, camera);
        // renderer.xr.enabled = false;
        // renderer.setRenderTarget(portalRenderTarget);
        // renderer.clear();
        // renderer.render(scene, camera);
    }

    function renderWorld (sceneObjects) {
        renderer.clippingPlanes = [];

        sceneObjects.forEach(m => {
            if (m.hasOwnProperty("material") && m.material.hasOwnProperty("clippingPlanes")) {
                m.material.clippingPlanes = isInsidePortal
                    ? globalPlaneOutside
                    : globalPlaneInside;
            }
        });

        portalMesh.material.side = isInsidePortal ? THREE.BackSide : THREE.FrontSide;

        camera.layers.enable(mapLayers.get("portal"));
        // if (isInsidePortal) {
        //     camera.layers.disable(mapLayers.get("outside"));
            camera.layers.enable(mapLayers.get("inside"));
        // } else {
        //     camera.layers.disable(mapLayers.get("inside"));
        //     camera.layers.enable(mapLayers.get("outside"));
        // }

        // portalRenderer.setRenderTarget(null);
        // portalRenderer.clear();
        // portalRenderer.render(scene, camera);
        // renderer.xr.enabled = true;
        // renderer.setRenderTarget(null); // <= Does not work in WebXR!
        // renderer.setRenderTarget(renderTarget); // <= Does not work in WebXR!
        // renderer.setRenderTarget(renderer.getRenderTarget());  // <= Does not work in WebXR!
        renderer.clear();
        renderer.render(scene, camera);
    }


    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();
        Object.values(controllers).forEach((controller) => {
            if (controller?.gamepad) {
                controller.gamepad.update();
            }
        });

        const data = {
            isInsidePortal,
            globalPlaneInside,
            globalPlaneOutside
        };

        if (controllers.hasOwnProperty("right") && controllers.right !== null) {

            const { gamepad, raySpace } = controllers.right;

            if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                console.log("Trigger on right controller was activated:", XR_BUTTONS.TRIGGER, gamepad);

                const controller_vector = new THREE.Group();

                raySpace.getWorldPosition(controller_vector.position);
                raySpace.getWorldQuaternion(controller_vector.quaternion);

                if (!!waiting_for_confirmation) {
                    console.log("Cancel action");
                    waiting_for_confirmation = false;
                }

                data.action = `Trigger on right controller was activated: ${XR_BUTTONS.TRIGGER}`;
                data.controller_vector = controller_vector;
                data.waiting_for_confirmation = waiting_for_confirmation;

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_1)) {
                console.log("BUTTON_1 (A) on right controller was activated:", XR_BUTTONS.BUTTON_1, gamepad);
                if (!!waiting_for_confirmation) {
                    console.log("Confirm action");
                    waiting_for_confirmation = false;

                    console.log("End session");

                    data.action = "End session confirmed";
                    data.waiting_for_confirmation = waiting_for_confirmation;
                    currentSession.end();
                }

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_2)) {
                console.log("BUTTON_2 (B) on right controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);

                if (!!waiting_for_confirmation) {
                    console.log("Cancel action");
                    waiting_for_confirmation = false;
                    data.action = "End session cancelled";
                } else {
                    console.log("Waiting for confirmation...")
                    waiting_for_confirmation = true;
                    data.action = "End session initiated";
                }

                data.waiting_for_confirmation = waiting_for_confirmation;

            } else {
                for (const b in XR_BUTTONS) {
                    if (XR_BUTTONS.hasOwnProperty(b)) {
                        // console.log("Check button: ", XR_BUTTONS[b]);
                        if (gamepad.getButtonClick(XR_BUTTONS[b])) {
                            console.log("Button on right controller was activated:", XR_BUTTONS[b], gamepad);

                            if (!!waiting_for_confirmation) {
                                console.log("Cancel action");
                                waiting_for_confirmation = false;
                            }

                            data.waiting_for_confirmation = waiting_for_confirmation;
                        }
                    }
                }
            }
        }

        if (controllers.hasOwnProperty("left") && controllers.left !== null) {

            const { gamepad, raySpace } = controllers.left;

            if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                console.log("Trigger on left controller was activated:", XR_BUTTONS.TRIGGER, gamepad);

                const controller_vector = new THREE.Group();

                raySpace.getWorldPosition(controller_vector.position);
                raySpace.getWorldQuaternion(controller_vector.quaternion);

                if (!!waiting_for_confirmation) {
                    console.log("Cancel action");
                    waiting_for_confirmation = false;
                }

                data.action = `Trigger on left controller was activated: ${XR_BUTTONS.TRIGGER}`;
                data.controller_vector = controller_vector;
                data.waiting_for_confirmation = waiting_for_confirmation;

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_1)) {
                console.log("BUTTON_1 (X) on left controller was activated:", XR_BUTTONS.BUTTON_1, gamepad);

                if (!!waiting_for_confirmation) {
                    console.log("Cancel action");
                    waiting_for_confirmation = false;
                }

                data.waiting_for_confirmation = waiting_for_confirmation;

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_2)) {
                console.log("BUTTON_2 (Y) on left controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);

                if (!!waiting_for_confirmation) {
                    console.log("Cancel action");
                    waiting_for_confirmation = false;
                }

                data.waiting_for_confirmation = waiting_for_confirmation;

            } else {
                for (const b in XR_BUTTONS) {
                    if (XR_BUTTONS.hasOwnProperty(b)) {
                        // console.log("Check button: ", XR_BUTTONS[b]);
                        if (gamepad.getButtonClick(XR_BUTTONS[b])) {
                            console.log("Button on left controller was activated:", XR_BUTTONS[b], gamepad);

                            if (!!waiting_for_confirmation) {
                                console.log("Cancel action");
                                waiting_for_confirmation = false;
                            }

                            data.waiting_for_confirmation = waiting_for_confirmation;
                        }
                    }
                }
            }
        }
        
        const scene_objects = updateScene(currentSession, delta, time, data, null);

        // renderer.render(scene, camera);
        renderPortal(scene_objects);
        renderWorld(scene_objects);
    });

    function startXR() {
        const sessionInit = {
            optionalFeatures: [
                "local-floor",
                "bounded-floor",
                "hand-tracking",
                "layers"
            ],
            requiredFeatures: [
                // "webgpu"
            ]
        };
        
        navigator.xr
            .requestSession("immersive-ar", sessionInit)
            .then(onSessionStarted);

        const vrDisplays = [];

        if (navigator.getVRDisplays) {
            function updateDisplay() {
                // Call `navigator.getVRDisplays` (before Firefox 59).
                navigator.getVRDisplays().then(displays => {
                    constole.log("Checking VR display");
                    if (!displays.length) {
                        throw new Error('No VR display found');
                    } else {
                        for (const display of displays) {
                            console.log("Found VR Display:", display);
                            vrDisplays.push(display);
                            container.innerHTML += `<br />
<span style="color: greenyellow">VR Display Connected!</span> <br />
<span style="color: greenyellow">Reload page to reset XR scene.</span>
`;
                        }
                    }
                });
            }

            // As of Firefox 59, it's preferred to also wait for the `vrdisplayconnect` event to fire.
            window.addEventListener('vrdisplayconnect', updateDisplay);
            window.addEventListener('vrdisplaydisconnect', e => console.log.bind(console));
            window.addEventListener('vrdisplayactivate', e => console.log.bind(console));
            window.addEventListener('vrdisplaydeactivate', e => console.log.bind(console));
            window.addEventListener('vrdisplayblur', e => console.log.bind(console));
            window.addEventListener('vrdisplayfocus', e => console.log.bind(console));
            window.addEventListener('vrdisplaypointerrestricted', e => console.log.bind(console));
            window.addEventListener('vrdisplaypointerunrestricted', e => console.log.bind(console));
            window.addEventListener('vrdisplaypresentchange', e => console.log.bind(console))
        }
    }

    async function onSessionStarted(session) {
        session.addEventListener("end", onSessionEnded);
        await renderer.xr.setSession(session);
        currentSession = session;
    }

    function onSessionEnded() {
        currentSession.removeEventListener("end", onSessionEnded);
        currentSession = null;
    }

    const xr_button = // VRButton.createButton(renderer);
        document.createElement("button");
    // xr_button.className = "vr-button";
    xr_button.className = "xr-button";
    xr_button.innerHTML = "Enter XR";
    xr_button.addEventListener('click', async () => {

        console.log("XR Button clicked");

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        startXR();

        previewWindow.width = window.innerWidth;
        previewWindow.height = window.innerHeight;

        renderer.setSize(previewWindow.width, previewWindow.height);

        camera.aspect = previewWindow.width / previewWindow.height;
        camera.updateProjectionMatrix();

        // Set camera position
        // camera.position.z = 0;
        camera.position.y = 0;

        player.position.z = camera.position.z;
        player.position.y = camera.position.y;

        updateScene(currentSession, delta, time);

        renderer.render(scene, camera);

        container.style = `display: inline-block; color: #FFF; font-size: 24px; text-align: center; background-color: #000; height: 100vh; min-width: ${previewWindow.width / 2}px; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
        container.innerHTML = "Reload page";
    });

    container.appendChild(xr_button);

}

initScene(setupScene)
    .then(() => {
        console.log("WebXR has been initialized");
    });

