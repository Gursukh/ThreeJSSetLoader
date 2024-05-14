import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { ColladaLoader } from './THREEJS/ColladaLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { flipY, get_page_offsets, get_warpgate_texture_offset, make_emissive, rgbToHex } from "./util.js";

export class Environment {

  constructor(viewport) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.info_box = document.getElementById("info-box")
    this.viewport = viewport;

    this.placement_group = new THREE.Group();
    this.collision_group = new THREE.Group();
    this.terrain_group = new THREE.Group();

    this.collada_loader = new ColladaLoader();
    this.obj_loader = new OBJLoader();
    this.dom_parser = new DOMParser();
    this.object_cache = {}

    this.network_queue = [];
    this.sema_count = 1;

    this.scene.add(this.placement_group)
    this.scene.add(this.terrain_group)
    this.scene.add(this.collision_group)

  }

  async init() {
    this.scene.background = new THREE.Color(0x404040)
    this.offset = get_page_offsets(viewport)
    this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);

    viewport.appendChild(this.renderer.domElement);
    this.resource_path_data = await (await fetch("docs/assets/collisionHierarchy.json")).json();
    this.objectphysics_data = await (await fetch("docs/assets/object_mappings.json")).json();

    this.add_lighting();
    this.add_info_raycast_event();

    // Create origin sphere
    var geometry = new THREE.SphereGeometry(0.1);
    var material = new THREE.MeshBasicMaterial({ color: 0xee00ee });
    var cube = new THREE.Mesh(geometry, material);
    cube.info = "world origin (0, 0, 0)";
    this.scene.add(cube);
  }


  add_info_raycast_event() {
    this.renderer.domElement.addEventListener("mousemove", (event) => {

      if (this.controls.isLocked) return

      event.preventDefault();

      this.mouse.x = ((event.clientX - this.offset.left) / event.target.width) * 2 - 1;
      this.mouse.y = -((event.clientY - this.offset.top) / event.target.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      var intersects = this.raycaster.intersectObject(this.scene, true);
      this.info_box.innerHTML = (intersects.length > 0 && intersects[0].object.info) ? intersects[0].object.info : ""
    })
  }

  add_lighting() {
    var key_light = new THREE.DirectionalLight(0xffffff, 0.75);
    var fill_light = new THREE.DirectionalLight(0xffffff, 2);
    var back_light = new THREE.DirectionalLight(0xffffff, 0.5);

    key_light.position.set(-100, 0, 100).normalize();
    fill_light.position.set(100, 1000, 100).normalize();
    back_light.position.set(100, 0, -100).normalize();

    this.scene.add(key_light);
    this.scene.add(fill_light);
    this.scene.add(back_light);
  }


  execute_promise(promise) {
    this.network_queue.push(promise);
  }

  async fetch_resource(url, type) {
    var stream = await fetch(url);
    if (type == "text") return await stream.text()
    if (type == "json") return await stream.json()
    console.error(`Invalid type: ${type} when fetching ${url}`);
  }

  load_collision(collision, callback) {

    // Clea the current collision group
    this.collision_group.children = []

    // Load the collision
    this.obj_loader.load(`docs/assets/collision/${collision}/collision.obj`,
      (object) => {
        object.scale.set(0.001, 0.001, 0.001)
        object.position.set(0, 0, 0);
        object.children.forEach(collision => collision.info = `collision: ${collision.name}`)
        this.collision_group.add(object);
        callback(object)
      });
  }

  clear_placement() {
    this.placement_group.children = [];
  }

  async load_placement(placement, callback) {

    // Clear the placement group
    this.placement_group.children = []

    let xml = await this.fetch_resource(`docs/assets/placement/${placement}`, "text")
    let xml_dom = this.dom_parser.parseFromString(xml, 'application/xml').children[0];

    // Group the objects of simmilar types
    let object_table = {}

    // Create each object
    for (let i = 0; i < xml_dom.childElementCount; i++) {

      var type = xml_dom.children[i].getAttribute("type")

      // If a group doesnt exist, create it
      if (!object_table[type]) {
        object_table[type] = new THREE.Group()
        object_table[type].name = type;
      }

      // Create
      try {
        var asset = await this.conceptualise_asset(xml_dom.children[i])
        if (asset != null) object_table[type].children.push(asset)
      } catch (error) {
        console.error(error + `failed to conceptualise ${type}`)
      }
    }

    // Add each object to the placement group
    Object.values(object_table).forEach(group => {
      this.placement_group.add(group)
    })


    console.log(this.scene)
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
    cube.info = (info == "" ? "undefined" : info);

    return cube;
  }

  async import_collada(path, cache) {

    let result = (cache && this.object_cache[path]) ?
      this.object_cache[path] :
      await this.collada_loader.loadAsync("docs/assets/" + path);

    let hasFlipped = (cache && this.object_cache[path]) ?
      true : false;

    if (cache || !this.object_cache[path]) this.object_cache[path] = { ...result };

    var object = []

    // .dae's are loaded as a scene with bones.
    // we must strip the geometry and apply it to a new mesh or it will break...
    result.scene.children.forEach((node) => {
      if (node.type != "SkinnedMesh") return;

      let model = new THREE.Mesh(node.geometry, node.material)
      model.scale.set(0.001, 0.001, 0.001)
      model.name = node.name.split(".")[0]

      if (!hasFlipped) model.geometry = flipY(model.geometry)
      model.geometry.computeVertexNormals()

      object = model
    })

    return object;
  }


  async load_asset(path, node, info = null, cache = true) {

    let model = (await this.import_collada("objects/" + path, cache))

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

  async load_character(name, main_node, info = null, cache = true) {

    let files = this.resource_path_data["player"][name];
    let character = new THREE.Group()

    let len = files.length;

    for (let i = 0; i < len; i++) {

      try {
        let result = await this.import_collada("player/" + name + "/" + files[i])
        result.scale.set(0.001, 0.001, 0.001)

        result.position.set(
          main_node.children[2].children[0].children[0].children[0].innerHTML * 0.001,
          (main_node.children[2].children[0].children[0].children[1].innerHTML * 0.001),
          main_node.children[2].children[0].children[0].children[2].innerHTML * 0.001
        );

        result.rotation.setFromQuaternion(new THREE.Quaternion(
          main_node.children[2].children[0].children[1].children[0].innerHTML,
          main_node.children[2].children[0].children[1].children[1].innerHTML,
          main_node.children[2].children[0].children[1].children[2].innerHTML,
          main_node.children[2].children[0].children[1].children[3].innerHTML,
        ).normalize());

        result.info = info
        result.name = name

        result.geometry.computeVertexNormals()
        character.add(result);

      } catch (error) {
        console.log(files[i])
        console.error("Error loading:" + error)
        continue;
      }
    }

    return character
  }

  set_file_lookup = {
    'eventbox': (node) => this.create_box(node, [0, 1, 0, 0.5], "event: " + node.children[1].children[3].innerHTML),
    'cameraeventbox': (node) => this.create_box(node, [1, 0, 0, 0.5], "cameraeventbox"),
    'amigo_collision': (node) => {
      node.children[2].children[0].children[0].children[1].innerHTML =
        parseFloat(node.children[2].children[0].children[0].children[1].innerHTML) -
        parseFloat(node.children[1].children[2].innerHTML * 0.1)
      return this.create_box(node, [1, 0, 1, 0.5], "amigo_collision")
    },
    'ring': async (node) => {
      let asset = await this.load_asset("Common/ring.dae", node, "ring")
      make_emissive(asset.material)
      return asset
    },
    'wvo_doorA': async (node) => await this.load_asset("wvo/wvo_obj_doorA.dae", node, "wvo_doorA"),
    'bell': async (node) => await this.load_asset("twn/twn_obj_bell.dae", node, "bell"),
    'shopTV': async (node) => await this.load_asset("twn/twn_obj_shopTV.dae", node, "shopTV"),
    'player_start2': async (node) => {
      let character = node.children[1].children[1].innerHTML
      return await this.load_character(character, node, character)
    },
    'candlestick': async (node) => await this.load_asset("twn/twn_obj_candlestick.dae", node, "candlestick"),
    'medal_of_royal_silver': async (node) => {
      let asset = await this.load_asset("twn/twn_obj_silvermdl.dae", node, "silver_medal")
      make_emissive(asset.material)
      return asset
    },
    'medal_of_royal_bronze': async (node) => {
      let asset = await this.load_asset("twn/twn_obj_bronzemdl.dae", node, "bronze_medal")
      make_emissive(asset.material)
      return asset
    },
    'common_stopplayercollision': async (node) => {
      node.children[2].children[0].children[0].children[1].innerHTML =
        parseFloat(node.children[2].children[0].children[0].children[1].innerHTML) -
        parseFloat(node.children[1].children[2].innerHTML * 0.1)
      return this.create_box(node, [0, 0, 1, 0.25], "common_stopplayercollision")
    },
    'common_terrain': (node) => {
      node.children[2].children[0].children[0].children[1].innerHTML =
        parseFloat(node.children[2].children[0].children[0].children[1].innerHTML) -
        parseFloat(node.children[1].children[2].innerHTML * 0.1)
      return this.create_box(node, [0, 0, 0, 0.5], "common_terrain")
    },
    'goalring': async (node) => await this.load_asset("Common/cmn_goalring.dae", node, "goalring"),
    'common dashring': async (node) => await this.load_asset("Common/cmn_dashring.dae", node, "dashring"),
    'dashpanel': async (node) => await this.load_asset("Common/cmn_dashpanel.dae", node, "dashpanel"),
    'trial_post': async (node) => await this.load_asset("twn/twn_obj_trialpillar.dae", node, "trial_post"),
    'eagle': async (node) => await this.load_asset("kdv/kdv_obj_eagle01.dae", node, "eagle"),
    'kingdomcrest': async (node) => {
      let asset = await this.load_asset("twn/twn_obj_crest.dae", node, "eagle")
      asset.material.transparent = true
      return asset
    },
    'warpgate': async (node) => {
      let asset = await this.load_asset("twn/twn_obj_warpgate.dae", node, "event: " + node.children[1].children[0].innerHTML, false)
      make_emissive(asset.material[2])
      asset.material[2].map.offset = get_warpgate_texture_offset(node.children[1].children[0].innerHTML)
      return asset
    },
    'objectphysics': async (node) => {
      var obj = node.children[1].children[0].innerHTML
      var path = this.objectphysics_data[obj]
      return path ? await this.load_asset(path + ".dae", node, obj) : null;
    },
    'objectphysics_item': async (node) => {
      var obj = node.children[1].children[0].innerHTML
      var path = this.objectphysics_data[obj]
      return path ? await this.load_asset(path + ".dae", node, obj) : null;
    },
    'savepoint': async (node) => await this.load_asset("Common/cmn_savepoint.dae", node, "savepoint"),
    'spring': async (node) => await this.load_asset("Common/cmn_spring.dae", node, "spring"),
    'common_hint': async (node) => {
      let asset = await this.load_asset("Common/cmn_Hint.dae", node, node.children[1].children[0].innerHTML)
      make_emissive(asset.material[1])
      return asset
    },
    'twn_door': async (node) => await this.load_asset("twn/twn_obj_door.dae", node, "town_door"),
    'common_hint_collision': async (node) => {
      let temp = node.children[1].children[0].innerHTML;
      node.children[1].children[0].innerHTML = node.children[1].children[1].innerHTML
      node.children[1].children[1].innerHTML = node.children[1].children[2].innerHTML
      node.children[1].children[2].innerHTML = node.children[1].children[3].innerHTML
      node.children[1].children[3].innerHTML = temp

      return this.create_box(node, [1, 1, 0, 0.5], node.children[1].children[3].innerHTML)
    }
  }

  async conceptualise_asset(node) {
    let type = node.getAttribute("type");
    let implemented = Object.keys(this.set_file_lookup)
    return implemented.includes(type) ? this.set_file_lookup[type](node) : null
  }

  async load_terrain(terrain, callback, progress_report) {

    this.terrain_group.children = [];
    let files = this.resource_path_data["terrain"][terrain];
    let len = files.length;

    for (let i = 0; i < len; i++) {
      this.info_box.innerText = (`loading: ${terrain}/${files[i]}`)

      try {
        progress_report((((i + 1) / len) * 100).toPrecision(3))
        let result = await this.import_collada(`terrain/${terrain}/${files[i]}`)
        result.position.set(0, 0, 0);
        result.name = files[i].split(".")[0]
        result.info = files[i].split(".")[0]

        if (result.name.includes("_sky")) {
          const materials = Array.isArray(result.material) ? result.material : [result.material];
          materials.forEach(m => {
            make_emissive(m);
            m.transparent = true;
          });
        }

        if (result.name.includes("_sdw")) {
          continue;
        }

        this.terrain_group.add(result);
      } catch (error) {
        console.error("Error loading terrain\n" + error)
        continue;
      }
    }

    this.info_box.innerText = "Finished Loading " + terrain
    callback(this.terrain_group.children);
  }



  render() {
    this.renderer.render(this.scene, this.camera);
  }
}