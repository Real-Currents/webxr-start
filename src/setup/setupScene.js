import { XR_BUTTONS } from "gamepad-wrapper";
import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";

let waiting_for_confirmation = false;

export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    // Place objects
    scene.add(plane);
    scene.add(rotatingCube);

    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;

        raySpace.getWorldPosition(plane.position);
        raySpace.getWorldQuaternion(plane.quaternion);
    }

    return function (currentSession, delta, time, sendDataToDOM) {

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

        if (controllers.hasOwnProperty("right") && controllers.right !== null) {

            const { gamepad, raySpace } = controllers.right;

            if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                console.log("Trigger on right controller was activated:", XR_BUTTONS.TRIGGER, gamepad);

                if (typeof sendDataToDOM === "function") {
                    sendDataToDOM({
                        action: `Trigger on right controller was activated: ${XR_BUTTONS.TRIGGER}`,
                        waiting_for_confirmation: waiting_for_confirmation
                    });
                }

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_1)) {
                console.log("BUTTON_1 (A) on right controller was activated:", XR_BUTTONS.BUTTON_1, gamepad);
                if (!!waiting_for_confirmation) {
                    console.log("Confirm action");
                    waiting_for_confirmation = false;
                    console.log("End session");
                    if (typeof sendDataToDOM === "function") {
                        sendDataToDOM({
                            action: "End session confirmed",
                            waiting_for_confirmation: waiting_for_confirmation
                        });
                    }
                    currentSession.end();
                }

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_2)) {
                console.log("BUTTON_2 (B) on right controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);

                if (!!waiting_for_confirmation) {
                    console.log("Cancel action");
                    waiting_for_confirmation = false;
                    if (typeof sendDataToDOM === "function") sendDataToDOM({
                        action: "End session cancelled",
                        waiting_for_confirmation: waiting_for_confirmation
                    });
                } else {
                    console.log("Waiting for confirmation...")

                    // // TODO: Create small planar mesh and canvas context
                    // //   ... draw confirmation dialog/buttons on canvas
                    // //   ... use to texture mesh and "prompt" user
                    // // (A) to confirm action / (B) to cancel action
                    // raySpace.getWorldPosition(prompt.position);
                    // raySpace.getWorldQuaternion(prompt.quaternion);

                    waiting_for_confirmation = true;
                    if (typeof sendDataToDOM === "function") sendDataToDOM({
                        action: "End session initiated",
                        waiting_for_confirmation: waiting_for_confirmation
                    });
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
    }
}
