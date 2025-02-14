window.addEventListener("DOMContentLoaded", async function () {
    if (navigator.xr) {
        const supported = await navigator.xr.isSessionSupported("immersive-ar");
        
        if (supported) {
            document.getElementById("renderCanvas").style.display = "block";
            document.getElementById("info-message").style.display = "none";

            const canvas = document.getElementById("renderCanvas");
            const engine = new BABYLON.Engine(canvas, true);
            
            const createScene = async function () {
                const scene = new BABYLON.Scene(engine);
                const camera = new BABYLON.FreeCamera("myCamera", new BABYLON.Vector3(0, 1, -5), scene);
                
                camera.setTarget(BABYLON.Vector3.Zero());
                camera.attachControl(canvas, true);
                
                const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 5, 0), scene);
                light.intensity = 0.1;

                const xr = await scene.createDefaultXRExperienceAsync({
                    optionalFeatures: true,
                    disableDefaultUI: true,
                });

                const fm = xr.baseExperience.featuresManager;
                fm.enableFeature(BABYLON.WebXRBackgroundRemover);
                const hitTest = fm.enableFeature(BABYLON.WebXRHitTest, "latest");
                const anchorSystem = fm.enableFeature(BABYLON.WebXRAnchorSystem, "latest");

                const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
                const measurementText = new BABYLON.GUI.TextBlock();
                measurementText.color = "white";
                measurementText.fontSize = 24;
                measurementText.text = "Measure distances";
                measurementText.top = "-40px";
                ui.addControl(measurementText);

                let lastHitTest = null;
                let currentPair = null;
                let pairs = [];

                const dot = BABYLON.MeshBuilder.CreateSphere("dot", { diameter: 0.05 }, scene);
                dot.material = new BABYLON.StandardMaterial("dotMat", scene);
                dot.material.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
                dot.isVisible = false;

                hitTest.onHitTestResultObservable.add((results) => {
                    if (results.length) {
                        dot.isVisible = true;
                        results[0].transformationMatrix.decompose(dot.scaling, dot.rotationQuaternion, dot.position);
                        lastHitTest = results[0];

                        if (currentPair) {
                            if (currentPair.line) {
                                currentPair.line.dispose();
                            }
                            currentPair.line = BABYLON.MeshBuilder.CreateLines("line", {
                                points: [currentPair.startDot.position, dot.position]
                            }, scene);

                            const distance = BABYLON.Vector3.Distance(currentPair.startDot.position, dot.position);
                            const roundedDist = Math.round(distance * 100) / 100;
                            measurementText.text = `Distance: ${roundedDist} m`;
                        }
                    } else {
                        dot.isVisible = false;
                        lastHitTest = null;
                    }
                });

                const processClick = () => {
                    const newDot = dot.clone("newDot");
                    if (!currentPair) {
                        currentPair = { startDot: newDot };
                    } else {
                        currentPair.endDot = newDot;
                        pairs.push(currentPair);
                        currentPair = null;
                    }
                };

                anchorSystem.onAnchorAddedObservable.add((anchor) => {
                    anchor.attachedNode = processClick();
                });

                scene.onPointerObservable.add(async (eventData) => {
                    if (lastHitTest) {
                        if (lastHitTest.xrHitResult.createAnchor) {
                            await anchorSystem.addAnchorPointUsingHitTestResultAsync(lastHitTest);
                        } else {
                            processClick();
                        }
                    }
                }, BABYLON.PointerEventTypes.POINTERDOWN);

                engine.runRenderLoop(() => {
                    scene.render();
                });

                return scene;
            };

            await createScene();
            window.addEventListener("resize", () => engine.resize());
        } else {
            document.getElementById("info-message").innerText = "Your device does not support WebXR AR.";
        }
    } else {
        document.getElementById("info-message").innerText = "WebXR is not available in your browser.";
    }
});
