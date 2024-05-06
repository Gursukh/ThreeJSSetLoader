
const hexToRgb = hex =>
  hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
    , (m, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1).match(/.{2}/g)
    .map(x => parseInt(x, 16))

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}).join('')

//THREE JS
var scene;
var camera;
var collision;
var xmlDOM;
var collisionGroups;
var placementGroup = new THREE.Group();
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
  dropdown.id = "placement-dropdown-input";
  for (let key in json) {
    const option = document.createElement('option');
    option.text = json[key]
    dropdown.add(option);
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

function updateColour(Mesh) {

  localStorage.setItem(Mesh.name, Mesh.colour);

  let r = Mesh.colour[0];
  let g = Mesh.colour[1];
  let b = Mesh.colour[2];
  let o = Mesh.colour[3];

  Mesh.material.transparent = o < 1;
  Mesh.material.opacity = o;
  Mesh.material.color.setRGB(r, g, b);
}

async function loadCollision(collision) {
  clearScene();

  var geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  var cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  var objectLoader = new THREE.OBJLoader();

  collisionGroups = [];

  objectLoader.load('docs/assets/collision/' + collision + "/collision.obj", function (object) {
    object.scale.set(0.001, 0.001, 0.001)
    object.position.set(0, 0, 0);
    col = object;
    scene.add(object);

    var collisionHierarchy = document.getElementById("collision-hierarchy")
    collisionHierarchy.innerHTML = '';
    col.children.sort()

    for (i = 0; i < col.children.length; i++) {

      var groupMesh = col.children[i];
      collisionGroups.push(groupMesh);


      if (localStorage.getItem(groupMesh.name)) {
        groupMesh.colour = localStorage.getItem(groupMesh.name).split(",")
      } else {
        groupMesh.colour = (groupMesh.name == "00100200") ? [1, 0, 0, 0.5] : [1, 1, 1, 1]
      }
      updateColour(groupMesh);

      addCollisionGroup(groupMesh, collisionHierarchy)
    }
  });
}

function createBox(Node, colour) {
  var geometry = new THREE.BoxGeometry(
    Node.children[1].children[1].innerHTML * 0.001,
    Node.children[1].children[2].innerHTML * 0.001,
    Node.children[1].children[0].innerHTML * 0.001);

  var material = new THREE.MeshBasicMaterial({ color: rgbToHex(colour[0] * 255,colour[1] * 255,colour[2] * 255) });
  material.transparent = colour[3] < 1;
  material.opacity = colour[3];
  var cube = new THREE.Mesh(geometry, material);

  cube.position.set(
    Node.children[2].children[0].children[0].children[0].innerHTML * 0.001,
    (Node.children[2].children[0].children[0].children[1].innerHTML * 0.001) + (Node.children[1].children[2].innerHTML * 0.0006),
    Node.children[2].children[0].children[0].children[2].innerHTML * 0.001
  );

  var Rotation = new THREE.Quaternion(
    Node.children[2].children[0].children[1].children[0].innerHTML,
    Node.children[2].children[0].children[1].children[1].innerHTML,
    Node.children[2].children[0].children[1].children[2].innerHTML,
    Node.children[2].children[0].children[1].children[3].innerHTML,
  );

  Rotation.normalize();

  cube.rotation.setFromQuaternion(Rotation);

  placementGroup.add(cube);
}

function showXML(PlacementID){
	var win = window.open("docs/assets/placement/"+PlacementID, '_blank');
	win.focus();
}

function instantiateBox(Node) {

  let colour = [1, 1, 1, 1]

  switch (Node.getAttribute("type")) {
    case "eventbox":
      colour = [0, 1, 0, 0.5]
      createBox(Node, colour);
      break;

    default:
      break;
  }


}

function clearPlacement() {
  placementGroup.children = []
}

async function loadPlacement(placement) {

  clearPlacement();

  let xml = await (await fetch("docs/assets/placement/" + placement)).text()
  let parser = new DOMParser();
  xmlDOM = parser.parseFromString(xml, 'application/xml').children[0];
  for (i = 0; i < xmlDOM.childElementCount; i++) {
    instantiateBox(xmlDOM.children[i]);
  }

  scene.add(placementGroup)
}

//Toggle Mesh Visability
function toggleVisability(MeshName) {
  for (i = 0; i < collisionGroups.length; i++) {
    if (MeshName == collisionGroups[i].name) {
      collisionGroups[i].visible = !collisionGroups[i].visible;
    }
  }
}

function addCollisionGroup(mesh, hierarchy) {
  let cont = document.createElement('div');
  cont.classList.add("collsion-node")
  let cp = document.createElement('input');
  cp.type = 'color'
  cp.value = rgbToHex(mesh.colour[0] * 255, mesh.colour[1] * 255, mesh.colour[2] * 255)
  cp.addEventListener('change', (e) => {
    mesh.colour = [hexToRgb(e.target.value)[0] / 255, hexToRgb(e.target.value)[1] / 255, hexToRgb(e.target.value)[2] / 255, mesh.colour[3]]
    updateColour(mesh);
  })

  let ir = document.createElement('input');
  ir.type = 'range'
  ir.max = 100
  ir.value = mesh.colour[3] * 100
  ir.addEventListener('change', (e) => {
    mesh.colour[3] = e.target.value / 100
    updateColour(mesh);
  })

  let li = document.createElement('button');
  li.setAttribute("t", "t")
  li.className = "colButton";
  li.innerHTML += mesh.name;
  li.onclick = function () {
    toggleVisability(li.innerHTML);
    if (li.getAttribute("t") == "f") {
      li.setAttribute("t", "t")
      li.style.backgroundColor = "white"
    }
    else {
      li.setAttribute("t", "f")
      li.style.backgroundColor = "grey"
    }
  };
  cont.appendChild(li);
  cont.appendChild(cp);
  cont.appendChild(ir)
  hierarchy.appendChild(cont);
}


// SETUP
function addEventListeners() {
  document.getElementById("load-collision").addEventListener("click", () => {
    loadCollision(document.getElementById("collision-dropdown-input").value);
  })

  
  document.getElementById("load-placement").addEventListener("click", () => {
    loadPlacement(document.getElementById("placement-dropdown-input").value);
  })

  
  document.getElementById("clear-placement").addEventListener("click", () => {
    clearPlacement();
  })

  
  document.getElementById("open-placement").addEventListener("click", () => {
    showXML(document.getElementById("placement-dropdown-input").value);
  })

  controls = new THREE.PointerLockControls(camera, renderer.domElement);
  speed = 1;

  renderer.domElement.addEventListener('click', function () {
    controls.lock();
  }, false);

  addEventListener('keydown', (e) => {
    keyboard[(e.key).toString().toLowerCase()] = true;
  });
  addEventListener('keyup', (e) => {
    keyboard[(e.key).toString().toLowerCase()] = false;
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

function processKeys() {
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


  var resourceData = await (await fetch("docs/assets/collisionHierarchy.json")).json();
  createCollisionDropdowns(document.getElementById("collision-dropdown"), resourceData["collision"])
  createPlacementDropdowns(document.getElementById("placement-dropdown"), resourceData["placement"])

  addEventListeners();
}

var animate = function () {
  requestAnimationFrame(animate);
  processKeys();

  renderer.render(scene, camera);
};

setup();
animate();