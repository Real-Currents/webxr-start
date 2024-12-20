import * as THREE from "three";
import { XR_BUTTONS } from "gamepad-wrapper";

let waiting_for_confirmation = false;

export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    return function (currentSession, delta, time, sendDataToDOM) {
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
