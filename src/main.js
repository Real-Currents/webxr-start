import * as THREE from "three";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment';
// import { VRButton } from "three/examples/jsm/webxr/VRButton";
// import { XRButton } from "three/examples/jsm/webxr/XRButton";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory";

import { HTMLMesh } from "three/addons/interactive/HTMLMesh";
import Stats from "three/addons/libs/stats.module";

import setupScene from "./setup/setupScene";

let currentSession;

let waiting_for_confirmation = false;

async function initRenderer (setup = (scene, camera, controllers, players) => {}) {

    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const controllerModelFactory = new XRControllerModelFactory();
    const controllers = {
        left: null,
        right: null,
    };

    const previewWindow = {
        width: window.innerWidth, // / 2, // 640,
        height: window.innerHeight + 10, // 480,
    };

    const body = document.body,
        container = document.createElement('div');
    container.style = `display: block; background-color: #000; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
    body.appendChild(container);

    console.log(container);

    // Setup Stats
    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.maxWidth = "100px";
    stats.dom.style.minWidth = "100px";
    stats.dom.style.backgroundColor = "black";
    document.body.appendChild(stats.dom);

    const statsMesh = new HTMLMesh( stats.dom );
    statsMesh.position.x = -1;
    statsMesh.position.y = 2;
    statsMesh.position.z = -2;
    statsMesh.rotation.y = Math.PI / 4;
    statsMesh.scale.setScalar(8);

    scene.add(statsMesh);

    const canvas= window.document.createElement('canvas');

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(previewWindow.width, previewWindow.height);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
        50,
        previewWindow.width / previewWindow.height,
        0.1,
        100,
    );
    camera.position.set(0, 1.6, 3);

    const controls = new OrbitControls(camera, container);
    controls.target.set(0, 1.6, 0);
    controls.update();

    console.log(renderer.domElement);

    container.appendChild(renderer.domElement);

    function onWindowResize() {
        camera.aspect = previewWindow.width / previewWindow.height;
        camera.updateProjectionMatrix();

        renderer.setSize(previewWindow.width, previewWindow.height);
    }

    window.addEventListener('resize', onWindowResize);

    const environment = new RoomEnvironment(renderer);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(environment).texture;

    const player = new THREE.Group();
    scene.add(player);

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

    const updateScene = await setup(scene, camera, controllers, player);

    renderer.setAnimationLoop(() => {

        const data = {};
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        stats.begin();

        Object.values(controllers).forEach((controller) => {
            if (controller?.gamepad) {
                controller.gamepad.update();
            }
        });

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
        
        updateScene(currentSession, delta, time, (data.hasOwnProperty("action")) ? data : null);

        renderer.render(scene, camera);

        stats.end();

        statsMesh.material.map.update();
    });

    async function getXRSession (xr) {

        console.log("xr", `${JSON.stringify(xr)}`);

        let session = null;

        try {
            session = await (xr.requestSession("immersive-ar", sessionInit));
        } catch (e) {
            session = await (xr.requestSession("immersive-vr", sessionInit));
        } finally {
            return session;
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

    const sessionInit = {
        optionalFeatures: [
            "local-floor",
            "bounded-floor",
            // "hand-tracking",
            "layers"
        ],
        requiredFeatures: [
            // "webgpu"
        ]
    };
    const xr_button =
        // VRButton.createButton(sessionInit);
        // XRButton.createButton(sessionInit);
        document.createElement("button");
    xr_button.className = "xr-button";
    xr_button.innerHTML = "Enter XR";
    xr_button.addEventListener('click', async () => {

        console.log("XR Button clicked");

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Does xr object exist?
        let nativeWebXRSupport = "xr" in navigator;

        try {

            if (nativeWebXRSupport) nativeWebXRSupport = (
                // Does xr object support sessions?
                await navigator.xr.isSessionSupported( 'immersive-ar' ) ||
                await navigator.xr.isSessionSupported('immersive-vr') ||
                nativeWebXRSupport
            )

        } catch (e) {
            console.log(e.message, navigator);
        }

        // If no XR/VR available, setup Immersive Web Emulation Runtime (iwer) and emulated XR device (@iwer/devui)
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

        const session = await getXRSession(navigator.xr);

        await onSessionStarted(session);

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

        updateScene(currentSession, delta, time, null, null);

        renderer.render(scene, camera);

        container.style = `display: block; color: #FFF; font-size: 24px; text-align: center; background-color: #000; height: 100vh; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
        xr_button.innerHTML = "Reload";
        xr_button.onclick = function () {
            xr_button.disabled = true;
            window.location.reload();
        };
    });

    container.appendChild(xr_button);

    return renderer;

}

initRenderer(setupScene)
    .then((renderer) => {
        console.log("WebXR has been initialized with renderer: ", renderer);
    });

