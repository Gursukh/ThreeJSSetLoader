import initializeUI, { processKeys } from './frontend.js';
import { Environment } from './sceneManager.js';


let environment = new Environment(document.getElementById("viewport"))
await environment.init();
initializeUI(environment);

function animate() {
  requestAnimationFrame(animate);
  processKeys(environment.camera);
  environment.render();
};

animate();