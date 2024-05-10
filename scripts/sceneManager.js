import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { ColladaLoader } from './THREEJS/ColladaLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { DDSLoader } from 'three/addons/loaders/DDSLoader.js';

import { rgbToHex } from "./util.js";

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

    this.placement_group = new THREE.Group();
    this.collision_group = new THREE.Group();
    this.terrain_group = new THREE.Group();

    this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    viewport.appendChild(this.renderer.domElement);

    this.addLighting();

    var geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    var cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);

    this.scene.add(this.placement_group)
    this.scene.add(this.terrain_group)
    this.scene.add(this.collision_group)
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
      this.collision_group.add(object);
      callback(object)
    });

    console.log(this.scene)
  }

  clear_placement() {
    this.placement_group.children = [];
  }

  async load_placement(placement, callback) {

    this.placement_group.children = []

    let xml = await (await fetch("docs/assets/placement/" + placement)).text()
    let parser = new DOMParser();
    let xml_dom = parser.parseFromString(xml, 'application/xml').children[0];

    let object_table = {}

    for (let i = 0; i < xml_dom.childElementCount; i++) {
      let [type, object] = await this.conceptualise_asset(xml_dom.children[i]);

      if (object_table[type]) {
        if (object != null) object_table[type].children.push(object)
      } else {
        object_table[type] = new THREE.Group();
        object_table[type].name = type;
      }
    }

    Object.values(object_table).forEach(group => {
      this.placement_group.add(group)
    })

    callback(object_table)
  }

  create_box(node, colour) {

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

    return cube;
  }

  async import_collada(path) {
    let result = await loader.loadAsync("docs/assets/" + path)
    var objects = []
    result.scene.children.forEach((node) => {

      if (node.type != "SkinnedMesh") return;

      let model = new THREE.Mesh(node.geometry, node.material)
      model.scale.set(0.001, 0.001, 0.001)
      model.name = node.name.split(".")[0]
      model.geometry.computeVertexNormals()

      objects.push(model)
    })

    return objects;
  }


  async load_asset(path, node) {

    let model = (await this.import_collada("objects/" + path))[0]

    console.log(node)

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

    return model

  }


  async conceptualise_asset(node) {

    let type = node.getAttribute("type");

    switch (type) {
      case "eventbox":
        return [type, this.create_box(node, [0, 1, 0, 0.5])];

      case "cameraeventbox":
        return [type, this.create_box(node, [1, 0, 0, 0.5])];

      // case "ring":
        // return [type, await this.load_asset("ring/ring.dae", node)];

      default:
        return [type, null];
    }
  }

  async load_terrain(terrain, callback, progress_report) {

    var resourceData = await (await fetch("docs/assets/collisionHierarchy.json")).json();


    this.terrain_group.children = [];
    let files = resourceData["terrain"][terrain];

    let len = files.length;

    for (let i = 0; i < len; i++) {
      let result = await loader.loadAsync("docs/assets/terrain/" + terrain + "/" + files[i])

      progress_report((((i + 1) / len) * 100).toPrecision(3))

      result.scene.children.forEach((node) => {

        let mats = node.material

        if (node.type == "SkinnedMesh") {
          let model = new THREE.Mesh(node.geometry, mats)
          model.scale.set(0.001, 0.001, 0.001)
          model.position.set(0, 0, 0);
          model.name = node.name.split(".")[0]

          model.geometry.computeVertexNormals()
          this.terrain_group.add(model);
        }
      })
    }

    callback(this.terrain_group.children);

  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}