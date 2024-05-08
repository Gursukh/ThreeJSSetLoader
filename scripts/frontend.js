import { MeshLambertMaterial, Vector3 } from "three";
import { hexToRgb, rgbToHex } from "./util.js";

var speed = 1;
var controls;
var keyboard = [];
var _vector = new Vector3();

export function processKeys(camera) {
  if (keyboard['w']) {
		camera.getWorldDirection(_vector)
		camera.position.addScaledVector( _vector, speed );
  }
  if (keyboard['s']) {
		camera.getWorldDirection(_vector)
		camera.position.addScaledVector( _vector, -speed );
  }
  if (keyboard['d']) controls.moveRight(speed)
  if (keyboard['a']) controls.moveRight(-speed)
}

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

function create_collision_node(mesh) {

  var div = document.createElement("div");
  div.classList.add("collision-node");
  div.style.opacity = 1;

  var button = document.createElement("button");
  button.classList.add("collision-button");

  button.innerText = mesh.name;
  button.addEventListener("click", (e) => {
    mesh.visible = !mesh.visible;
    div.style.opacity = div.style.opacity == 1 ? 0.5 : 1;
  })
  div.appendChild(button);

  var color = document.createElement("input");
  color.type = "color";
  color.value = rgbToHex(
    mesh.material.color.r * 255,
    mesh.material.color.g * 255,
    mesh.material.color.b * 255,
  )
  color.addEventListener("input", (e) => {
    var new_colour = hexToRgb(e.currentTarget.value)
    mesh.material.color.r =  new_colour[0] / 255;
    mesh.material.color.g =  new_colour[1] / 255;
    mesh.material.color.b =  new_colour[2] / 255;
    localStorage.setItem(mesh.name + "-color", new_colour)
  })
  div.appendChild(color);

  var opacity = document.createElement("input");
  opacity.type = "number";
  opacity.max = 100; 
  opacity.min = 0;
  opacity.value = mesh.material.opacity * 100;
  opacity.addEventListener("input", (e) => {
    mesh.material.transparent = e.currentTarget.value < 100;
    mesh.material.opacity = e.currentTarget.value / 100
    localStorage.setItem(mesh.name + "-opacity", mesh.material.opacity)
  })
  div.appendChild(opacity);

  return div;
}

function create_placement_node(node, value) {

  var div = document.createElement("div");
  div.classList.add("placement-node");
  div.style.opacity = 1;

  var button = document.createElement("button");
  button.classList.add("placement-button");

  if(value.children.length == 0) button.disabled =true;

  button.innerText = node;
  button.addEventListener("click", (e) => {
    if(div.style.opacity == 1) {
      div.style.opacity = 0.5;
      value.children.forEach(node => {node.visible = false})
    } else {
      div.style.opacity = 1;      
      value.children.forEach(node => {node.visible = true})
    }
  })
  div.appendChild(button);

  return div;
}

function update_collision_heirarchy(collisionGroup) {
  var collision_container = document.getElementById("collision-hierarchy")
  collision_container.innerHTML = ""

  collisionGroup.children.forEach(mesh => {

    mesh.material = new MeshLambertMaterial()
    mesh.material.shininess = 1


    if(localStorage.getItem(mesh.name + "-color")) {
      var colors = localStorage.getItem(mesh.name + "-color").split(",")
      mesh.material.color.r = colors[0] / 255;
      mesh.material.color.g = colors[1] / 255;
      mesh.material.color.b = colors[2] / 255;
    }

    if(localStorage.getItem(mesh.name + "-opacity")) {
      var opacity = localStorage.getItem(mesh.name + "-opacity");
      mesh.material.opacity = opacity;
      mesh.material.transparent = opacity < 1;
    }

    collision_container.appendChild(
      create_collision_node(mesh)
    )
  })
}

function update_placement_heirarchy(placement_table) {
  var placement_container = document.getElementById("placement-hierarchy")
  placement_container.innerHTML = ""

  Object.keys(placement_table).sort().forEach(k => {
    if(placement_table[k].children.length > 0)
    placement_container.appendChild(
      create_placement_node(k, placement_table[k])
    )
  })
  
  Object.keys(placement_table).sort().forEach(k => {
    if(placement_table[k].children.length == 0)
    placement_container.appendChild(
      create_placement_node(k, placement_table[k])
    )
  })
}

function addEventListeners(environment) {

  document.getElementById("load-collision").addEventListener("click", () => {


    var placement_container = document.getElementById("placement-hierarchy")
    placement_container.innerHTML = ""

    environment.load_collision(
      document.getElementById("collision-dropdown-input").value, 
      update_collision_heirarchy
    );
  })

  
  document.getElementById("load-placement").addEventListener("click", () => {

    environment.load_placement(
      document.getElementById("placement-dropdown-input").value,  
      update_placement_heirarchy
    );
  })

  
  document.getElementById("clear-placement").addEventListener("click", () => {
    
    var placement_container = document.getElementById("placement-hierarchy")
    placement_container.innerHTML = ""
    
    environment.clear_placement();
  })

  
  document.getElementById("open-placement").addEventListener("click", () => {
    showXML(document.getElementById("placement-dropdown-input").value);
  })

  environment.renderer.domElement.addEventListener('click', function () {
    environment.controls.lock();
  }, false);

  addEventListener('keydown', (e) => {
    keyboard[(e.key).toString().toLowerCase()] = true;
  });
  addEventListener('keyup', (e) => {
    keyboard[(e.key).toString().toLowerCase()] = false;
  });

  addEventListener('wheel', (e) => {
      speed *=  e.deltaY > 0 ? 0.90 : 10 / 9;
      document.getElementById("speedometer").innerText = "speed: " + speed.toPrecision(2);
  });
}

export default async function initializeUI(environment) {
  var resourceData = await (await fetch("docs/assets/collisionHierarchy.json")).json();
  controls = environment.controls;
  createCollisionDropdowns(document.getElementById("collision-dropdown"), resourceData["collision"])
  createPlacementDropdowns(document.getElementById("placement-dropdown"), resourceData["placement"])
  addEventListeners(environment);
}

