import * as THREE from 'three';

export const hexToRgb = hex =>
  hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
    , (m, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1).match(/.{2}/g)
    .map(x => parseInt(x, 16))

export const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}).join('')

export function showXML(PlacementID) {
  var win = window.open("docs/assets/placement/" + PlacementID, '_blank');
  win.focus();
}

export function flipY(geometry) {

  var uv = geometry.attributes.uv;

  for (var i = 0; i < uv.count; i++) {

    uv.setY(i, 1 - uv.getY(i));

  }

  return geometry;

}

export function get_warpgate_texture_offset(txt) {
  switch (txt) {
    case "goto_wvo": return new THREE.Vector2(0, 0);
    case "goto_dtd": return new THREE.Vector2(0.25, 0);
    case "goto_wap": return new THREE.Vector2(0.5, 0);
    case "goto_csc": return new THREE.Vector2(0.75, 0);
    case "goto_flc": return new THREE.Vector2(0, 0.33);
    case "goto_rct": return new THREE.Vector2(0.25, 0.33);
    case "goto_tpj": return new THREE.Vector2(0.5, 0.33);
    case "goto_kdv": return new THREE.Vector2(0.75, 0.33);
    case "goto_aqa": return new THREE.Vector2(0, 0.66);
    case "goto_end": return new THREE.Vector2(0.25, 0.66);
  }
}