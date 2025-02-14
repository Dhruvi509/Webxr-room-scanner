import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

let scene, camera, renderer;
let hitTestSource = null;
let hitTestSourceRequested = false;
let xrSession = null;

document.getElementById('start-ar').addEventListener('click', async () => {
    if (navigator.xr) {
        try {
            xrSession = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'] });
            await setupXR(xrSession);
        } catch (err) {
            console.error("WebXR Error:", err);
        }
    } else {
        alert("WebXR not supported on this device.");
    }
});

async function setupXR(session) {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    renderer = new THREE.WebGLRenderer({ alpha: true, canvas });
    renderer.xr.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);

    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, renderer.getContext()) });

    const referenceSpace = await session.requestReferenceSpace('local');

    session.requestAnimationFrame((time, frame) => render(time, frame, referenceSpace));

    document.body.appendChild(renderer.domElement);
}

function render(time, frame, referenceSpace) {
    if (!xrSession) return;

    const pose = frame.getViewerPose(referenceSpace);
    if (pose && !hitTestSourceRequested) {
        const viewerSpace = xrSession.requestReferenceSpace('viewer');
        xrSession.requestHitTestSource({ space: viewerSpace }).then(source => {
            hitTestSource = source;
        });
        hitTestSourceRequested = true;
    }

    if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
            const hitPose = hitTestResults[0].getPose(referenceSpace);
            console.log(`Detected surface at: X=${hitPose.transform.position.x}, Y=${hitPose.transform.position.y}, Z=${hitPose.transform.position.z}`);
            
            document.getElementById('output').innerText = 
                `Surface detected at: ${hitPose.transform.position.x.toFixed(2)}, ${hitPose.transform.position.y.toFixed(2)}, ${hitPose.transform.position.z.toFixed(2)} meters`;
        }
    }

    renderer.render(scene, camera);
    xrSession.requestAnimationFrame((t, f) => render(t, f, referenceSpace));
}
