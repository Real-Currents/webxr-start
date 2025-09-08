
export default async function setupScene (
    scene,
    camera,
    controllers,
    player,
    videoLayerManager
) {

    // Set player view
    player.add(camera);

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
