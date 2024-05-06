//THREE JS
var scene;
var camera;
var collision;
var xmlDOM;
var collisionGroups;
var renderer;
var controls;
var speed;
var keyboard = [];

// FRONTEND
function createCollisionDropdowns(div, json) {
  const dropdown = document.createElement('select');
  dropdown.id = 'collision-dropdown-input';

  for (let key in json) {
    if (json.hasOwnProperty(key)) {
      const subJson = json[key];
      for (let subKey in subJson) {
        if (subJson.hasOwnProperty(subKey)) {
          const option = document.createElement('option');
          option.text = key + "/" + subKey;
          dropdown.add(option);
        }
      }
    }
  }
  div.appendChild(dropdown);
}

function createPlacementDropdowns(div, json) {
  const dropdown = document.createElement('select');

  for (let key in json) {
    if (json.hasOwnProperty(key)) {
      const subJson = json[key];
      for (let subKey in subJson) {
        if (subJson.hasOwnProperty(subKey)) {
          const option = document.createElement('option');
          option.text = json[key]
          dropdown.add(option);
        }
      }
    }
  }
  div.appendChild(dropdown);
}

// BACKEND
function clearScene() {
  scene.children = [];

  //Add Lighting back
  var keyLight = new THREE.DirectionalLight(new THREE.Color("rgb(250,250,250)"), 0.7);
  keyLight.position.set(-100, 0, 100).normalize();
  var fillLight = new THREE.DirectionalLight(new THREE.Color("rgb(204,204,204)"), 0.75);
  fillLight.position.set(100, 1000, 100).normalize();
  var backLight = new THREE.DirectionalLight(0xffffff, 0.5);
  backLight.position.set(100, 0, -100).normalize();
  scene.add(keyLight);
  scene.add(fillLight);
  scene.add(backLight);

}

function setColour(Mesh) {
  switch (Mesh.name) {
    case "00100200":
      Mesh.material.transparent = true;
      Mesh.material.opacity = 0.5;
      Mesh.material.color.setRGB(1, 0, 0);
      break;
    default:
      break;
  }
}

async function loadCollision(collision) {
  clearScene();

  var geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  var cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  var objectLoader = new THREE.OBJLoader();

  collisionGroups = [];

  objectLoader.load('resources/collision/' + collision + "/collision.obj", function (object) {
    object.scale.set(0.001, 0.001, 0.001)
    object.position.set(0, 0, 0);
    col = object;
    scene.add(object);

    // var colList = document.getElementById("collisionList");
    // colList.innerHTML = '';

    for (i = 0; i < col.children.length; i++) {

      var groupMesh = col.children[i];
      collisionGroups.push(groupMesh);

      setColour(groupMesh);

      // let li = document.createElement('button');
      // li.setAttribute("t","t")
      // li.className = "colButton";
      // li.innerHTML += groupMesh.name;
      // li.onclick = function() {
      // 	toggleVisability(li.innerHTML);
      // 	if(li.getAttribute("t") == "f"){
      // 		li.setAttribute("t","t")
      // 		li.style.backgroundColor = "white"
      // 	}
      // 	else{
      // 		li.setAttribute("t","f")
      // 		li.style.backgroundColor = "grey"
      // 	}
      // };
      // colList.appendChild(li);
    }
  });
}


// SETUP

function addEventListeners() {
  document.getElementById("load-collision").addEventListener("click", () => {
    loadCollision(document.getElementById("collision-dropdown-input").value);
  })

  controls = new THREE.PointerLockControls(camera, renderer.domElement);
  speed = 1;

  renderer.domElement.addEventListener('click', function () {
    controls.lock();
  }, false);

  addEventListener('keydown', (e) => {
    keyboard[e.key] = true;
  });
  addEventListener('keyup', (e) => {
    keyboard[e.key] = false;
  });
  addEventListener('wheel', (e) => {
    if (e.deltaY > 0) {
      speed *= 0.90;
    }
    else if (e.deltaY < 0) {
      speed *= 10 / 9;
    }
  });
}

function processKeys(){
	if (keyboard['w']) controls.moveForward(speed)
	if (keyboard['s']) controls.moveForward(-speed)
	if (keyboard['d']) controls.moveRight(speed)
	if (keyboard['a']) controls.moveRight(-speed)
}

async function setup() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();

  var viewport = document.getElementById("viewport");

  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  viewport.appendChild(renderer.domElement);


  var resourceData = await (await fetch("/collisionHierarchy.json")).json();
  createCollisionDropdowns(document.getElementById("collision-dropdown"), resourceData["collision"])
  createPlacementDropdowns(document.getElementById("placement-dropdown"), resourceData["placement"])

  addEventListeners();
}

setup() 
var animate = function () {
  requestAnimationFrame(animate);
  processKeys();

  renderer.render(scene, camera);
};

animate();