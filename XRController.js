import * as THREE from 'three';
import { XRController } from './XRController.js'; 

let scene, camera, renderer;
let xrController;
let hitTestSource = null;
let hitTestSourceRequested = false;

document.getElementById('start-ar').addEventListener('click', () => {
    if (navigator.xr) {
        navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'] })
            .then(session => startXRSession(session))
            .catch(err => console.log("WebXR error:", err));
    } else {
        alert("WebXR not supported on this device.");
    }
});

function startXRSession(session) {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    renderer = new THREE.WebGLRenderer({ alpha: true, canvas: canvas, antialias: true });
    renderer.xr.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);

    xrController = new XRController(session, scene);

    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, renderer.getContext()) });

    session.requestReferenceSpace('local').then(referenceSpace => {
        session.requestAnimationFrame((time, frame) => render(time, frame, referenceSpace));
    });

    document.body.appendChild(renderer.domElement);
}

function render(time, frame, referenceSpace) {
    const session = renderer.xr.getSession();

    if (session && frame) {
        const pose = frame.getViewerPose(referenceSpace);

        if (pose && !hitTestSourceRequested) {
            const viewerSpace = session.requestReferenceSpace('viewer');
            session.requestHitTestSource({ space: viewerSpace }).then(source => {
                hitTestSource = source;
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hitPose = hitTestResults[0].getPose(referenceSpace);
                xrController.updateRoomData(hitPose.transform.position);
            }
        }
    }

    renderer.render(scene, camera);
    session.requestAnimationFrame((t, f) => render(t, f, referenceSpace));
}
