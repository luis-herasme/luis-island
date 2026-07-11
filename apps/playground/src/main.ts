import { Quaternion, Vector3 } from "@game/math";
import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Renderer,
  Scene,
  createBoxGeometry,
  createPlaneGeometry,
} from "@game/render";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas);

const scene = new Scene();

const cube = new Mesh(createBoxGeometry(1, 1, 1), new MeshLambertMaterial(0xff8844));
cube.position.set(0, 0.5, 0);
scene.add(cube);

const ground = new Mesh(createPlaneGeometry(10, 10), new MeshLambertMaterial(0x334455));
ground.position.set(0, -0.5, 0);
scene.add(ground);

const sun = new DirectionalLight(0xffffff, 1);
sun.direction.set(-0.5, -1, -0.3);
scene.add(sun);
scene.add(new AmbientLight(0xffffff, 0.25));

const camera = new PerspectiveCamera(Math.PI / 3, 1, 0.1, 100);
camera.position.set(2.5, 2, 3.5);
camera.lookAt(cube.position);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const spin = new Quaternion();
const yAxis = new Vector3(0, 1, 0);
const xAxis = new Vector3(1, 0, 0);

let previousTime = performance.now();
function frame(currentTime: number) {
  const deltaTime = Math.min((currentTime - previousTime) / 1000, 0.1);
  previousTime = currentTime;

  spin.setFromAxisAngle(yAxis, deltaTime * 0.9);
  cube.quaternion.premultiply(spin);
  spin.setFromAxisAngle(xAxis, deltaTime * 0.4);
  cube.quaternion.premultiply(spin);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
