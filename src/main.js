import * as THREE from "three";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment';
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory";

import { HTMLMesh } from "three/addons/interactive/HTMLMesh";
import Stats from "three/addons/libs/stats.module";

import loadManager from "./loadManager";
import setupScene from "./setup/setupScene";

let currentSession;

let waiting_for_confirmation = false;

async function initRenderer (setup = (renderer, scene, camera, controllers, players) => {}) {

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
    statsMesh.position.x = -1.5;
    statsMesh.position.y = 2;
    statsMesh.position.z = -1;
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
        1000,
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
                mesh
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

    const updateScene = await setup(renderer, scene, camera, controllers, player);

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
    const xr_button = document.createElement("button");
    xr_button.className = "xr-button";
    xr_button.disabled = true;
    xr_button.innerHTML = "Preparing...";
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

        const initSceneDataIn = {
            "events": [
                {
                    "action": "play_sounds"
                }
            ]
        }

        updateScene(currentSession, delta, time, initSceneDataIn, null);

        renderer.render(scene, camera);

        container.style = `display: block; color: #FFF; font-size: 24px; text-align: center; background-color: #000; height: 100vh; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
        xr_button.innerHTML = "Reload";
        xr_button.onclick = function () {
            xr_button.disabled = true;
            window.location.reload();
        };
    });

    container.append(loadManager.div);

    await loadManager.addLoadHandler(async () => {

        renderer.setAnimationLoop(() => {

            const data = {};
            const delta = clock.getDelta();
            const time = clock.getElapsedTime();

            const sceneDataUpdate = {};

            stats.begin();

            Object.values(controllers).forEach((controller) => {
                if (controller?.gamepad) {
                    controller.gamepad.update();
                }
            });

            if (controllers.hasOwnProperty("right") && controllers.right !== null) {

                const {gamepad, raySpace} = controllers.right;

                if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                    console.log("Trigger on right controller was activated:", XR_BUTTONS.TRIGGER, gamepad);

                    sceneDataUpdate.action = `Trigger on right controller was activated: ${XR_BUTTONS.TRIGGER}`;
                    sceneDataUpdate.waiting_for_confirmation = waiting_for_confirmation;

                } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_1)) {
                    console.log("BUTTON_1 (A) on right controller was activated:", XR_BUTTONS.BUTTON_1, gamepad);
                    if (!!waiting_for_confirmation) {
                        console.log("Confirm action");
                        waiting_for_confirmation = false;
                        console.log("End session");
                        sceneDataUpdate.action = "End session confirmed";
                        sceneDataUpdate.waiting_for_confirmation = waiting_for_confirmation;
                        currentSession.end();
                    }

                } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_2)) {
                    console.log("BUTTON_2 (B) on right controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);

                    if (!!waiting_for_confirmation) {
                        console.log("Cancel action");
                        waiting_for_confirmation = false;
                        sceneDataUpdate.action = "End session cancelled";
                        sceneDataUpdate.waiting_for_confirmation = waiting_for_confirmation;

                    } else {
                        console.log("Waiting for confirmation...")
                        waiting_for_confirmation = true;
                        sceneDataUpdate.action = "End session initiated";
                        sceneDataUpdate.waiting_for_confirmation = waiting_for_confirmation;
                    }

                } else {
                    for (const b in XR_BUTTONS) {
                        if (XR_BUTTONS.hasOwnProperty(b)) {
                            // console.log("Check button: ", XR_BUTTONS[b]);
                            if (gamepad.getButtonClick(XR_BUTTONS[b])) {
                                console.log("Button on right controller was activated:", XR_BUTTONS[b], gamepad);
                            }
                        }
                    }
                }
            }

            updateScene(currentSession, delta, time, (Object.keys(sceneDataUpdate).length > 0) ? sceneDataUpdate : null, function (sceneDataOut) {
                if ("events" in sceneDataOut && sceneDataOut.events.length > 0) {
                    console.log(sceneDataOut);

                    xr_button.innerHTML = "Enter XR";
                    xr_button.style.opacity = 0.75;
                    xr_button.disabled = false;
                    delete xr_button.disabled;
                }
            });

            renderer.render(scene, camera);

            stats.end();

            statsMesh.material.map.update();
        });

        container.appendChild(xr_button);
    });

    return renderer;

}

initRenderer(setupScene)
    .then((renderer) => {
        console.log("WebXR has been initialized with renderer: ", renderer);
    });

