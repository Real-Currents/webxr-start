import { XR_BUTTONS } from "gamepad-wrapper";
import plane from "../objects/plane";

let waiting_for_confirmation = false;

export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    // Place objects
    scene.add(plane);

    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;

        raySpace.getWorldPosition(plane.position);
        raySpace.getWorldQuaternion(plane.quaternion);
    }

    return function (currentSession, delta, time, updateDOMData) {
        if (controllers.hasOwnProperty("right") && controllers.right !== null) {

            const { gamepad, raySpace } = controllers.right;

            // Power Ball
            if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
                console.log("Trigger on right controller was activated:", XR_BUTTONS.TRIGGER, gamepad);

                // raySpace.getWorldPosition(bullet.position);
                // raySpace.getWorldQuaternion(bullet.quaternion);

                if (typeof updateDOMData === "function") {
                    updateDOMData({
                        action: `Trigger on right controller was activated: ${XR_BUTTONS.TRIGGER}`,
                        waiting_for_confirmation: waiting_for_confirmation
                    });
                }

            } else if (gamepad.getButtonClick(XR_BUTTONS.BUTTON_1)) {
                console.log("BUTTON_2 (A) on right controller was activated:", XR_BUTTONS.BUTTON_2, gamepad);
                if (!!waiting_for_confirmation) {
                    console.log("Confirm action");
                    waiting_for_confirmation = false;
                    console.log("End session");
                    if (typeof updateDOMData === "function") {
                        updateDOMData({
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
                    updateDOMData({
                        action: "End session cancelled",
                        waiting_for_confirmation: waiting_for_confirmation
                    });
                } else {
                    console.log("Waiting for confirmation...")
                    waiting_for_confirmation = true;
                    updateDOMData({
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
