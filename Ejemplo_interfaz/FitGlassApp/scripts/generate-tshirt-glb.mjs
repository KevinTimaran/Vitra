/**
 * Genera assets/models/tshirt.glb: una camiseta básica procedural.
 *
 *   node scripts/generate-tshirt-glb.mjs
 *
 * - Silueta frontal de camiseta (cuerpo + mangas + escote) extruida con bisel.
 * - Cuello (ribete) como un tubo siguiendo el borde del escote, con material distinto.
 * - Orientación: +Y arriba, frente hacia +Z, centrada en el origen. Unidades ~ metros.
 * - Materiales: MeshStandardMaterial lisos (sin texturas) para que GLTFLoader no necesite
 *   ImageBitmap / Blob de imágenes en React Native.
 *
 * Solo usa `three`, que ya es dependencia del proyecto.
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// GLTFExporter (modo binario) usa FileReader, que no existe en Node.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const HEM_Y = -0.55;
const DEPTH = 0.1; // grosor del torso (sin bisel)
const BEVEL = 0.035;

// Contorno de la camiseta (sentido antihorario, empezando en el centro del bajo).
const shape = new THREE.Shape();
shape.moveTo(0, HEM_Y);
shape.lineTo(0.27, HEM_Y);
shape.quadraticCurveTo(0.245, -0.25, 0.27, 0.06); // costado derecho con ligera cintura
shape.lineTo(0.44, -0.05); // sisa → puño interior de la manga
shape.lineTo(0.6, 0.05); // puño exterior
shape.lineTo(0.27, 0.31); // borde superior de la manga hasta el hombro
shape.lineTo(0.11, 0.34); // hombro hasta el cuello
shape.quadraticCurveTo(0.1, 0.23, 0, 0.23); // escote lado derecho
shape.quadraticCurveTo(-0.1, 0.23, -0.11, 0.34); // escote lado izquierdo
shape.lineTo(-0.27, 0.31);
shape.lineTo(-0.6, 0.05);
shape.lineTo(-0.44, -0.05);
shape.lineTo(-0.27, 0.06);
shape.quadraticCurveTo(-0.245, -0.25, -0.27, HEM_Y);
shape.lineTo(0, HEM_Y);

const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
  depth: DEPTH,
  bevelEnabled: true,
  bevelThickness: BEVEL,
  bevelSize: BEVEL,
  bevelSegments: 5,
  curveSegments: 20,
});
bodyGeometry.clearGroups(); // un único material para el cuerpo
bodyGeometry.translate(0, 0, -DEPTH / 2); // centrar el grosor en z = 0
bodyGeometry.computeVertexNormals();

// Cuello: tubo que sigue el escote.
const neckCurve = new THREE.CurvePath();
neckCurve.add(new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(-0.11, 0.34, 0),
  new THREE.Vector3(-0.1, 0.23, 0),
  new THREE.Vector3(0, 0.23, 0),
));
neckCurve.add(new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(0, 0.23, 0),
  new THREE.Vector3(0.1, 0.23, 0),
  new THREE.Vector3(0.11, 0.34, 0),
));
const neckPoints = neckCurve.getPoints(24);
const collarGeometry = new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3(neckPoints),
  48,
  DEPTH / 2 + BEVEL + 0.006,
  12,
  false,
);

const shirtMaterial = new THREE.MeshStandardMaterial({
  name: 'ShirtFabric',
  color: 0xe8edf5,
  roughness: 0.9,
  metalness: 0,
});
const collarMaterial = new THREE.MeshStandardMaterial({
  name: 'ShirtCollar',
  color: 0x5b6b8a,
  roughness: 0.85,
  metalness: 0,
});

const body = new THREE.Mesh(bodyGeometry, shirtMaterial);
body.name = 'TShirtBody';
const collar = new THREE.Mesh(collarGeometry, collarMaterial);
collar.name = 'TShirtCollar';

const root = new THREE.Group();
root.name = 'TShirt';
root.add(body, collar);

// Centrar verticalmente en el origen.
const box = new THREE.Box3().setFromObject(root);
const center = box.getCenter(new THREE.Vector3());
root.position.sub(center);
root.updateMatrixWorld(true);

const scene = new THREE.Scene();
scene.add(root);

const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(scene, { binary: true });

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../assets/models/tshirt.glb');
await mkdir(dirname(out), { recursive: true });
await writeFile(out, Buffer.from(glb));

const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
console.log(`OK ${out} (${glb.byteLength} bytes) size=${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`);
