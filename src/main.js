import * as THREE from "three";

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment';
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory";

import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import Stats from "https://unpkg.com/three@0.118.3/examples/jsm/libs/stats.module.js";

import loadManager from "./loadManager";
import setupScene from "./setup/setupScene";

let currentSession;

let waiting_for_confirmation = false;

function getPortalClippingPlanes (renderer, camera) {

    // Setup Clipping planes
    let xrCamera = renderer.xr.getCamera(camera);
    let xrCameraMatrix = xrCamera.matrixWorld;
    let xrCameraA = new THREE.Vector3();
    xrCameraA.setFromMatrixPosition(xrCameraMatrix);
    // // xrCameraDirection From:
    // // https://stackoverflow.com/questions/59554505/how-can-i-get-camera-world-direction-with-webxr#answer-59687055
    // let xrCameraDX = xrCameraMatrix.elements[8],
    //     xrCameraDY = xrCameraMatrix.elements[9],
    //     xrCameraDZ = xrCameraMatrix.elements[10];
    // let xrCameraDirection = new THREE.Vector3(-xrCameraDX, -xrCameraDY, -xrCameraDZ).normalize();

    // console.log(xrCameraA);

    const viewingPlaneLeft = -1; // x left
    const viewingPlaneRight = 1; // x right
    const viewingPlaneTop = 2.5; // y top
    const viewingPlaneBottom = 1; // y bottom
    const viewingPlaneDepth = 0; // z
    const viewingPlaneHorizonalCenter = 0;
    const viewingPlaneVerticalCenter= (viewingPlaneBottom + viewingPlaneTop) / 2; // (viewingPlaneTop - viewingPlaneBottom)/ 2 + viewingPlaneBottom

    const clippingLeftP = new THREE.Vector3(viewingPlaneLeft, xrCameraA.y, viewingPlaneDepth);
    const clippingRightP = new THREE.Vector3(viewingPlaneRight, xrCameraA.y, viewingPlaneDepth);
    const clippingTopP = new THREE.Vector3(xrCameraA.x, viewingPlaneTop, viewingPlaneDepth);
    const clippingBottomP = new THREE.Vector3(xrCameraA.x, viewingPlaneBottom, viewingPlaneDepth);

    const vDLeft = new THREE.Vector3();
    vDLeft.subVectors(clippingLeftP, xrCameraA);
    const vDRight = new THREE.Vector3();
    vDRight.subVectors(clippingRightP, xrCameraA);
    const vDTop = new THREE.Vector3();
    vDTop.subVectors(clippingTopP, xrCameraA);
    const vDBottom = new THREE.Vector3();
    vDBottom.subVectors(clippingBottomP, xrCameraA);

    const clippingLeftUnitVector = new THREE.Vector3(1.0, 0, 0);
    const clippingLeftDirection = vDLeft.clone().cross(new THREE.Vector3(0, 1.0, 0)).normalize();
    const clippingLeftUnitAngleToDirection = clippingLeftUnitVector.angleTo(clippingLeftDirection.clone());
    const clippingLeftX = Math.cos(clippingLeftUnitAngleToDirection) * viewingPlaneLeft;
    const clippingRightUnitVector = new THREE.Vector3(-1.0, 0, 0);
    const clippingRightDirection = vDRight.clone().cross(new THREE.Vector3(0, -1.0, 0)).normalize();
    const clippingRightUnitAngleToDirection = clippingRightUnitVector.angleTo(clippingRightDirection.clone());
    const clippingRightX = Math.cos(clippingRightUnitAngleToDirection) * viewingPlaneRight;
    const clippingTopUnitVector = new THREE.Vector3(0, -1.0, 0);
    const clippingTopDirection = vDTop.clone().cross(new THREE.Vector3(1.0, 0, 0)).normalize();
    const clippingTopUnitAngleToDirection = clippingTopUnitVector.angleTo(clippingTopDirection.clone());
    const clippingTopY = Math.cos(clippingTopUnitAngleToDirection) * viewingPlaneTop;
    const clippingBottomUnitVector = (xrCameraA.z > viewingPlaneDepth) ?
        new THREE.Vector3(0, 1.0, 0) :
        new THREE.Vector3(0, -1.0, 0);
    const clippingBottomDirection = vDBottom.clone().cross(new THREE.Vector3(-1, 0, 0)).normalize(); // new THREE.Vector3(0, 1, 0);
    const clippingBottomUnitAngleToDirection = clippingBottomUnitVector.angleTo(clippingBottomDirection.clone());
    const clippingBottomY = Math.cos(clippingBottomUnitAngleToDirection) * viewingPlaneBottom; // viewingPlaneBottom = 1.0 // length on unit circle

    const clippingLeftPlane = new THREE.Plane(clippingLeftDirection.clone(), -clippingLeftX);
    const clippingRightPlane = new THREE.Plane(clippingRightDirection.clone(), clippingRightX);
    const clippingTopPlane = new THREE.Plane(clippingTopDirection.clone(), clippingTopY);
    const clippingBottomPlane = new THREE.Plane(clippingBottomDirection.clone(), clippingBottomY * -(viewingPlaneBottom - 0.001));
    const clippingPlaneInside = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const clippingPlaneOutside = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

    const clipping_data = {
        "leftΘ": clippingLeftUnitAngleToDirection,
        "leftX": clippingLeftX,
        "rightΘ": clippingRightUnitAngleToDirection,
        "rightX": clippingRightX,
        "topΘ": clippingTopUnitAngleToDirection,
        "topY": clippingTopY,
        "bottomΘ": clippingBottomUnitAngleToDirection,
        "bottomY": clippingBottomY
    };

    const clipping_data_for_html = JSON.stringify(clipping_data)
        .replace(new RegExp("\\\\n", "g"), '<br />')
        .replace(new RegExp('"\:', "g"), '":<br />')
        .replace(new RegExp(',', "g"), '",<br />')
        .replace(new RegExp("{", "g"), '{<br />')
        .replace(new RegExp("}", "g"), '<br />}');

    // console.log(clipping_data_for_html);

    return [
        clippingLeftPlane,
        clippingRightPlane,
        clippingTopPlane,
        clippingBottomPlane,
        ...(xrCameraA.z > viewingPlaneDepth) ?
            [ clippingPlaneOutside ] :
            [ clippingPlaneInside, clippingPlaneOutside ]
    ];
}

async function initScene (setup = (scene, camera, controllers, players) => {}) {

    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const controllerModelFactory = new XRControllerModelFactory();
    const controllers = {
        left: null,
        right: null,
    };

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
        1000,
    );
    camera.position.set(0, 1.6, 1);

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
                raySpace,
                gripSpace,
                mesh,
                gamepad: new GamepadWrapper(e.data.gamepad),
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

        // updateScene(currentSession, delta, time);

        renderer.render(scene, camera);

        container.style = `display: block; color: #FFF; font-size: 24px; text-align: center; background-color: #000; height: 100vh; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;
        container.innerHTML = "Reload page";
    });

    container.append(loadManager.div);

    currentSession = null;

    const updateScene = await setup(scene, camera, controllers, player);

    await loadManager.addLoadHandler(async () => {

        // setTimeout(async () => {

            renderer.setAnimationLoop(() => {
                const delta = clock.getDelta();
                const time = clock.getElapsedTime();
                Object.values(controllers).forEach((controller) => {
                    if (controller?.gamepad) {
                        controller.gamepad.update();
                    }
                });

                const sceneDataUpdate = {};

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

                stats.begin();

                const clippingPlanes  = getPortalClippingPlanes(renderer, camera);

                if (currentSession !== null) renderer.clippingPlanes =  [
                    ...clippingPlanes
                ];

                updateScene(
                    currentSession,
                    delta,
                    time,
                    (Object.keys(sceneDataUpdate).length > 0) ? sceneDataUpdate : null,
                    null,
                    [
                        ...clippingPlanes
                    ]
                );

                renderer.render(scene, camera);

                stats.end();
                statsMesh.material.map.update();
            });

            container.appendChild(xr_button);

        // }, 5333);
    });

}

initScene(setupScene)
    .then(() => {
        console.log("WebXR has been initialized");
    });

