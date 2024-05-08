export async function load_mesh_from_file(collision, environment) {
  var objectLoader = new THREE.OBJLoader();

  collisionGroups = [];

  objectLoader.load('docs/assets/collision/' + collision + "/collision.obj", function (object) {
    object.scale.set(0.001, 0.001, 0.001)
    object.position.set(0, 0, 0);
    environment.set_collision(object);

    var collisionHierarchy = document.getElementById("collision-hierarchy")
    collisionHierarchy.innerHTML = '';
    col.children.sort()

    for (let i = 0; i < col.children.length; i++) {

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
