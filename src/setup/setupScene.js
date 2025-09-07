import * as THREE from "three";
import setupVideoLayerManager from "./setupVideoLayerManager";


export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    const video = document.getElementById( 'video' );
    // document.body.appendChild(video);
    // video.loop = true;
    // video.src = 'assets/videos/Lake_Champlain.webm';
    // video.src = 'assets/videos/Lake_Champlain.mp4';
    // video.width = previewWindow.width;
    // video.height = previewWindow.height;
    // video.play();

    // container.addEventListener( 'click', function () {
    //     video.play();
    // });

    const videoWidth = 2064;
    const videoHeight = 2208;
    const videoReducer = 0.090579710;

    const videoLayerManager = setupVideoLayerManager(video);

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
