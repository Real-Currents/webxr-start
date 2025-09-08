import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";

export default async function setupScene (
    scene,
    camera,
    controllers,
    player,
    videoLayerManager
) {

    // Set player view
    player.add(camera);

    // Place objects
    plane.translateY(-1);
    scene.add(plane);
    scene.add(rotatingCube);

    return function updateScene (currentSession, delta, time, sceneDataIn, sceneDataOut) {

        const data_out = {};

        if (typeof sceneDataIn === "object" && sceneDataIn != null) {
            console.log("sceneDataIn:", sceneDataIn);

            // TODO:
            // video.play();
        }

        if (typeof sceneDataOut === "function") {
            sceneDataOut(data_out);
        }
    }
}
