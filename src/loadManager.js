import * as THREE from "three";


// <div id="loading">
//     <div class="progress"><div class="progressbar"></div></div>
// </div>

const loadManager = new THREE.LoadingManager();
const loadingElem = document.createElement("div");
loadingElem.id = "loading";
const progressBarElem = document.createElement("div");
progressBarElem.className = "progressbar";
loadingElem.append(progressBarElem);

loadManager.handlers = [
    () => {
        loadingElem.style.opacity = 1.0;

        const fadeProgressBar =() => {
            loadingElem.style.opacity = loadingElem.style.opacity - 0.1;
            if (typeof fadeProgressBar == "function" && loadingElem.style.opacity > 0.0) {
                setTimeout(fadeProgressBar, 33);
            } else {
                loadingElem.style.display = 'none';
            }
        };

        // fadeProgressBar();
    },
];

loadManager.addLoadHandler = (handler) => {
    loadManager.handlers.push(handler);
};

loadManager.onLoad = () => {
    loadManager.handlers.map((h) => (typeof h === "function") ? h() : (() => {})());
};

loadManager.onProgress = (urlOfLastItemLoaded, itemsLoaded, itemsTotal) => {
    const progress = itemsLoaded / itemsTotal;
    progressBarElem.style.transform = `scaleX(${progress})`;
};

export default loadManager;
