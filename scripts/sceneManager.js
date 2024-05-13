import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { ColladaLoader } from './THREEJS/ColladaLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { DDSLoader } from 'three/addons/loaders/DDSLoader.js';

import { flipY, get_warpgate_texture_offset, rgbToHex } from "./util.js";

const manager = new THREE.LoadingManager();
manager.addHandler(/./g, new DDSLoader())
var loader = new ColladaLoader(manager);

export class Environment {

  constructor(viewport) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x404040)
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.offset = this.getPageTopLeft(viewport)
    this.resourceData;
    this.objectPhysicsData;

    this.placement_group = new THREE.Group();
    this.collision_group = new THREE.Group();
    this.terrain_group = new THREE.Group();
    this.info_box = document.getElementById("info-box")

    this.objectCache = {}

    this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    viewport.appendChild(this.renderer.domElement);

    this.addLighting();
    this.addEventFunctionality();

    var geometry = new THREE.SphereGeometry(0.1);
    var material = new THREE.MeshBasicMaterial({ color: 0xee00ee });
    var cube = new THREE.Mesh(geometry, material);
    cube.info = "world origin (0, 0, 0)";
    this.scene.add(cube);

    this.scene.add(this.placement_group)
    this.scene.add(this.terrain_group)
    this.scene.add(this.collision_group)
  }

  addEventFunctionality() {

    this.renderer.domElement.addEventListener("mousemove", this.display_info)
  }

  getPageTopLeft(el) {
    var rect = el.getBoundingClientRect();
    var docEl = document.documentElement;
    return {
      left: rect.left + (window.pageXOffset || docEl.scrollLeft || 0),
      top: rect.top + (window.pageYOffset || docEl.scrollTop || 0)
    };
  }

  display_info = (event) => {

    if (this.controls.isLocked) return

    event.preventDefault();

    this.mouse.x = ((event.clientX - this.offset.left) / event.target.width) * 2 - 1;
    this.mouse.y = -((event.clientY - this.offset.top) / event.target.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    var intersects = this.raycaster.intersectObject(this.scene, true);

    if (intersects.length > 0 && intersects[0].object.info) {
      this.info_box.innerHTML = intersects[0].object.info
    } else {
      this.info_box.innerHTML = ""
    }
  }

  addLighting() {
    var keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
    var fillLight = new THREE.DirectionalLight(0xffffff, 2);
    var backLight = new THREE.DirectionalLight(0xffffff, 0.5);

    keyLight.position.set(-100, 0, 100).normalize();
    fillLight.position.set(100, 1000, 100).normalize();
    backLight.position.set(100, 0, -100).normalize();

    this.scene.add(keyLight);
    this.scene.add(fillLight);
    this.scene.add(backLight);
  }

  load_collision(collision, callback) {

    this.collision_group.children = []

    var objectLoader = new OBJLoader(manager);

    objectLoader.load('docs/assets/collision/' + collision + "/collision.obj", (object) => {
      object.scale.set(0.001, 0.001, 0.001)
      object.position.set(0, 0, 0);
      object.children.forEach(collision => collision.info = "collision: " + collision.name)
      this.collision_group.add(object);
      callback(object)
    });
  }

  clear_placement() {
    this.placement_group.children = [];
  }

  async load_placement(placement, callback) {

    this.placement_group.children = []

    this.objectPhysicsData = await (await fetch("docs/assets/object_mappings.json")).json();

    let xml = await (await fetch("docs/assets/placement/" + placement)).text()
    let parser = new DOMParser();
    let xml_dom = parser.parseFromString(xml, 'application/xml').children[0];

    let object_table = {}

    for (let i = 0; i < xml_dom.childElementCount; i++) {
      let result;

      try {
        result = await this.conceptualise_asset(xml_dom.children[i]);
        let [type, object] = result
        if (object_table[type]) {
          if (object != null) object_table[type].children.push(object)
        } else {
          object_table[type] = new THREE.Group();
          object_table[type].name = type;
          if (object != null) object_table[type].children.push(object)
        }
      } catch (error) {
        console.error(error);
        continue;
      }

    }

    console.log(this.scene)

    Object.values(object_table).forEach(group => {
      this.placement_group.add(group)
    })


    callback(object_table)
  }

  create_box(node, colour, info = null) {

    var geometry = new THREE.BoxGeometry(
      node.children[1].children[1].innerHTML * 0.001,
      node.children[1].children[2].innerHTML * 0.001,
      node.children[1].children[0].innerHTML * 0.001);

    var material = new THREE.MeshBasicMaterial({ color: rgbToHex(colour[0] * 255, colour[1] * 255, colour[2] * 255) });
    material.transparent = colour[3] < 1;
    material.opacity = colour[3];

    var cube = new THREE.Mesh(geometry, material);

    cube.position.set(
      node.children[2].children[0].children[0].children[0].innerHTML * 0.001,
      (node.children[2].children[0].children[0].children[1].innerHTML * 0.001) + (node.children[1].children[2].innerHTML * 0.0006),
      node.children[2].children[0].children[0].children[2].innerHTML * 0.001
    );

    var Rotation = new THREE.Quaternion(
      node.children[2].children[0].children[1].children[0].innerHTML,
      node.children[2].children[0].children[1].children[1].innerHTML,
      node.children[2].children[0].children[1].children[2].innerHTML,
      node.children[2].children[0].children[1].children[3].innerHTML,
    );
    Rotation.normalize();

    cube.rotation.setFromQuaternion(Rotation);
    cube.info = "event: " + (info == "" ? "undefined" : info);

    return cube;
  }

  async import_collada(path, cache) {
    let result; // = await loader.loadAsync("docs/assets/" + path)
    if (cache && this.objectCache[path]) {
      result = this.objectCache[path];
    } else {
      result = await loader.loadAsync("docs/assets/" + path)
      this.objectCache[path] = { ...result };
    }

    var objects = []
    result.scene.children.forEach((node) => {

      if (node.type != "SkinnedMesh") return;

      let model = new THREE.Mesh(node.geometry, node.material)
      model.scale.set(0.001, 0.001, 0.001)
      model.name = node.name.split(".")[0]


      model.geometry = flipY(model.geometry)

      model.geometry.computeVertexNormals()

      objects.push(model)
    })

    return objects;
  }


  async load_asset(path, node, info = null, cache = true) {

    let model = (await this.import_collada("objects/" + path, cache))[0];

    model.position.set(
      node.children[2].children[0].children[0].children[0].innerHTML * 0.001,
      (node.children[2].children[0].children[0].children[1].innerHTML * 0.001),
      node.children[2].children[0].children[0].children[2].innerHTML * 0.001
    );


    model.rotation.setFromQuaternion(new THREE.Quaternion(
      node.children[2].children[0].children[1].children[0].innerHTML,
      node.children[2].children[0].children[1].children[1].innerHTML,
      node.children[2].children[0].children[1].children[2].innerHTML,
      node.children[2].children[0].children[1].children[3].innerHTML,
    ).normalize());

    model.info = info

    return model

  }


  async conceptualise_asset(node) {

    let type = node.getAttribute("type");
    let asset = null;

    switch (type) {
      case "eventbox":
        asset = this.create_box(node, [0, 1, 0, 0.5], node.children[1].children[3].innerHTML)
        break;

      case "cameraeventbox":
        asset = this.create_box(node, [1, 0, 0, 0.5], "cameraeventbox")
        break;

      case "amigo_collision":
        asset = this.create_box(node, [1, 0, 1, 0.5], "amigo_collision")
        break;

      case "ring":
        asset = await this.load_asset("Common/ring.dae", node, "ring")
        break;

      case "goalring":
        asset = await this.load_asset("Common/cmn_goalring.dae", node, "goalring")
        break;

      case "common_dashring":
        asset = await this.load_asset("Common/cmn_dashring.dae", node, "dashring")
        break;

      case "dashpanel":
        asset = await this.load_asset("Common/cmn_dashpanel.dae", node, "dashpanel")
        break;

      case "trial_post":
        asset = await this.load_asset("twn/twn_obj_trialpillar.dae", node, "trial_post")
        break;

      case "eagle":
        asset = await this.load_asset("kdv/kdv_obj_eagle01.dae", node, "eagle")
        break;

      case "kingdomcrest":
        asset = await this.load_asset("twn/twn_obj_crest.dae", node, "eagle")
        asset.material.transparent = true
        break;

      case "warpgate":
        asset = await this.load_asset("twn/twn_obj_warpgate.dae", node, "event: " + node.children[1].children[0].innerHTML, false)
        let material = asset.material[2]
        material.emissive = new THREE.Color(1, 1, 1);
        material.emissiveMap = material.map
        material.map.offset = get_warpgate_texture_offset(node.children[1].children[0].innerHTML)
        break;

      case "objectphysics":
        var obj = node.children[1].children[0].innerHTML
        var path = this.objectPhysicsData[obj]
        asset = path ? await this.load_asset(path + ".dae", node, obj) : null;
        if (!path) console.log(path)
        break

      case "savepoint":
        asset = await this.load_asset("Common/cmn_savepoint.dae", node, "savepoint")
        break

      case "spring":
        asset = await this.load_asset("Common/cmn_spring.dae", node, "spring")
        break

      case "common_hint":
        asset = await this.load_asset("Common/cmn_Hint.dae", node, node.children[1].children[0].innerHTML)
        break

      case "common_hint_collision":
        let temp = node.children[1].children[0].innerHTML;
        node.children[1].children[0].innerHTML = node.children[1].children[1].innerHTML
        node.children[1].children[1].innerHTML = node.children[1].children[2].innerHTML
        node.children[1].children[2].innerHTML = node.children[1].children[3].innerHTML
        node.children[1].children[3].innerHTML = temp

        asset = this.create_box(node, [1, 1, 0, 0.5], node.children[1].children[3].innerHTML)
        break;

      default:
        break;
    }

    return [type, asset]
  }

  async load_terrain(terrain, callback, progress_report) {


    this.resourceData = await (await fetch("docs/assets/collisionHierarchy.json")).json();

    this.terrain_group.children = [];
    let files = this.resourceData["terrain"][terrain];

    let len = files.length;

    for (let i = 0; i < len; i++) {
      this.info_box.innerText = ("loading: " + terrain + "/" + files[i])
      let result
      try {
        result = await loader.loadAsync("docs/assets/terrain/" + terrain + "/" + files[i])
      } catch (error) {
        console.log(files[i], result)
        console.error("Error loading:" + error)
        continue;
      }

      progress_report((((i + 1) / len) * 100).toPrecision(3))

      result.scene.children.forEach((node) => {

        if (node.type != "SkinnedMesh") return

        let model = new THREE.Mesh(node.geometry, node.material)
        model.info = node.name
        model.scale.set(0.001, 0.001, 0.001)
        model.position.set(0, 0, 0);
        model.name = node.name.split(".")[0]
        model.geometry = flipY(model.geometry)

        model.geometry.computeVertexNormals()
        this.terrain_group.add(model);

      })
    }

    this.info_box.innerText = "Finished Loading " + terrain
    callback(this.terrain_group.children);

  }



  render() {
    this.renderer.render(this.scene, this.camera);
  }
}