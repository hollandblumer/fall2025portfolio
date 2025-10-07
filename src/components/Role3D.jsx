// Role3D.jsx
import { useEffect, useRef } from "react";

export default function Role3D() {
  const containerRef = useRef(null);
  const styleElRef = useRef(null);
  const scriptElRef = useRef(null);

  useEffect(() => {
    // 1) Inject your styles exactly as in the snippet
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-role3d-style", "true");
    styleEl.textContent = `
      html, body { margin: 0; height: 100%; background: radial-gradient(#3a2419,#1c120d); }
      #role3d {
        position: fixed; inset: 0;
        display: block;
        z-index: 5; /* put above your background */
      }
      .overlay-ui {
        position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
        font: 600 14px/1.4 Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: #e9d9c8; letter-spacing: .08em; opacity: .7;
      }
    `;
    document.head.appendChild(styleEl);
    styleElRef.current = styleEl;

    // 2) Inject your <script type="module"> exactly (no modifications)
    const code = `
/* ===== Imports (pinned) ===== */
import * as THREE from "https://esm.sh/three@0.172.0";
import { FontLoader }   from "https://esm.sh/three@0.172.0/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://esm.sh/three@0.172.0/examples/jsm/geometries/TextGeometry.js";
import { RGBELoader }   from "https://esm.sh/three@0.172.0/examples/jsm/loaders/RGBELoader.js";

/* ===== Renderer / Scene / Camera ===== */
const canvas   = document.getElementById('role3d');
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, canvas });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 8, 42);

/* Subtle orbit feel without a control lib */
let orbitX = 0, orbitY = 0, isDown = false, lastX = 0, lastY = 0;
const onPointer = (dx, dy, mult=0.003) => { orbitX += dy*mult; orbitY += dx*mult; orbitX = THREE.MathUtils.clamp(orbitX, -0.65, 0.65); };
addEventListener('pointerdown', e => { isDown = true; lastX = e.clientX; lastY = e.clientY; });
addEventListener('pointerup',   () => { isDown = false; });
addEventListener('pointermove', e => { if(!isDown) return; onPointer(e.clientX-lastX, e.clientY-lastY); lastX = e.clientX; lastY = e.clientY; });

/* ===== HDR environment for tasty reflections ===== */
let envPMREM;
(async ()=>{
  const pmrem = new THREE.PMREMGenerator(renderer);
  envPMREM = pmrem.fromEquirectangular(
    await new RGBELoader().loadAsync("https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr")
  ).texture;
  scene.environment = envPMREM;
})();

/* ===== Lights (warm bronze) ===== */
scene.add(new THREE.AmbientLight(0x302015, 0.65));
const key = new THREE.DirectionalLight(0xffe3c4, 1.15); key.position.set(16, 24, 18); scene.add(key);
const rim = new THREE.PointLight(0xffffff, 0.8, 120);  rim.position.set(-14, 10, 28); scene.add(rim);

/* ===== Procedural hammered bump (fast CanvasTexture) ===== */
class Rand { constructor(seed){ this.m_w=seed; this.m_z=987654321; this.mask=0xffffffff; }
  next(){ this.m_z=(36969*(this.m_z&65535)+(this.m_z>>>16))&this.mask;
          this.m_w=(18000*(this.m_w&65535)+(this.m_w>>>16))&this.mask;
          let r=((this.m_z<<16)+this.m_w)&this.mask; r/=4294967296; return r+0.5; } }
function perlin2D(size=512, seed=1337){
  const c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d');
  const rnd=new Rand(seed);

  // value noise grid
  const G=64, step=size/G, grid=[...Array((G+1)*(G+1))].map(()=>rnd.next());
  const gidx=(x,y)=> grid[y*(G+1)+x];

  const img=ctx.createImageData(size,size);
  const d=img.data;

  function lerp(a,b,t){ return a + (b-a)*t; }
  function smooth(t){ return t*t*(3-2*t); }

  for(let y=0;y<size;y++){
    const gy=y/step; const gy0=Math.floor(gy), gy1=gy0+1; const ty=smooth(gy-gy0);
    for(let x=0;x<size;x++){
      const gx=x/step; const gx0=Math.floor(gx), gx1=gx0+1; const tx=smooth(gx-gx0);
      const v00=gidx(gx0,gy0), v10=gidx(gx1,gy0), v01=gidx(gx0,gy1), v11=gidx(gx1,gy1);
      const v0=lerp(v00,v10,tx), v1=lerp(v01,v11,tx), v=lerp(v0,v1,ty); // 0..1
      const n = Math.pow(v, 1.15); // slight contrast
      const g = (n*255)|0;
      const i=(y*size+x)*4;
      d[i]=g; d[i+1]=(g*0.9)|0; d[i+2]=(g*0.7)|0; d[i+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
  return t;
}
const hammeredBump = perlin2D(512, 4242);

/* ===== Luxe bronze material ===== */
const bronzeMat = new THREE.MeshPhysicalMaterial({
  color: 0x8c5c3e,                  // bronze
  metalness: 0.95,
  roughness: 0.28,
  clearcoat: 0.6,
  clearcoatRoughness: 0.25,
  envMapIntensity: 1.35,
  bumpMap: hammeredBump,
  bumpScale: 7,
  sheen: 0.0,
  reflectivity: 1.0,
  ior: 1.8,
  transparent: true,                // we’ll animate opacity per char
  opacity: 1.0
});

/* ===== Font + phrase builder ===== */
const loader = new FontLoader();
const PHRASES = ["Creative Technologist", "Full-Stack Developer"];

const SIZE   = 1.1;                  // base letter size
const HEIGHT = 0.42;                 // extrusion
const BEVEL  = { bevelEnabled:true, bevelThickness:0.1, bevelSize:0.07, bevelSegments:1 };
const TRACK  = 0.16;                 // spacing factor
const SPACE  = 0.52;                 // space width factor

const root = new THREE.Group();
scene.add(root);

/* Width-only responsive scaling so composition stays consistent */
const WIDTH_BASE = 1280;
const widthScale = () => Math.max(0.45, Math.min(1.25, innerWidth / WIDTH_BASE));
root.scale.setScalar(widthScale());

let currentGroup=null, nextGroup=null, phraseIndex=0;
let font;

/* Build a group of meshes, one per character, with micro “hand-wobble” */
function buildPhrase(text){
  const group = new THREE.Group();
  let xCursor = 0;
  for (let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch===' '){ xCursor += SIZE*SPACE; continue; }

    const geo = new TextGeometry(ch, { font, size: SIZE, height: HEIGHT, ...BEVEL });
    geo.computeBoundingBox();
    // hammered silhouette: nudge vertices a touch
    const pos = geo.attributes.position;
    for (let j=0;j<pos.count;j++){
      const wob = (Math.sin(j*0.37) + Math.cos(j*0.19))*0.015;
      pos.setXYZ(j, pos.getX(j) + wob*0.7, pos.getY(j) - wob*0.6, pos.getZ(j));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
    const mesh = new THREE.Mesh(geo, bronzeMat.clone());

    // vertically center-ish per character
    const h = geo.boundingBox.max.y - geo.boundingBox.min.y;
    mesh.position.set(xCursor, -h*0.5*0.25, 0);

    // per-char color micro-variation
    const tint = new THREE.Color(0x8c5c3e).lerp(new THREE.Color(0xD6AE8E), Math.random()*0.12);
    mesh.material.color.copy(tint);

    group.add(mesh);
    xCursor += w + SIZE*TRACK;
  }
  group.userData.totalWidth = xCursor;
  centerGroup(group);
  return group;
}

function centerGroup(g){
  const w=g.userData.totalWidth||0;
  g.position.set(-w*0.5, 0, 0);
}

/* Transition: staggered spin-out / spin-in with opacity */
function queueTransitionTo(targetIndex){
  nextGroup = buildPhrase(PHRASES[targetIndex]);
  centerGroup(nextGroup);
  root.add(nextGroup);

  const now = performance.now();
  const dir = (targetIndex === 1) ? 1 : -1; // alternate spin direction a bit
  const outDur=650, inDur=750, inDelay=180;

  currentGroup.children.forEach((m,i)=>{
    m.userData.anim = { type:'out', t0: now + i*40, dur: outDur, dir };
  });
  nextGroup.children.forEach((m,i)=>{
    m.material.opacity = 0;
    m.rotation.y = -Math.PI * dir;
    m.position.y -= 0.6;
    m.userData.anim = { type:'in', t0: now + inDelay + i*40, dur: inDur, dir };
  });

  // cleanup & schedule next swap
  const endA = now + (currentGroup.children.length-1)*40 + outDur;
  const endB = now + inDelay + (nextGroup.children.length-1)*40 + inDur;
  const done = Math.max(endA, endB) + 30;

  setTimeout(()=>{
    root.remove(currentGroup);
    currentGroup = nextGroup; nextGroup = null;
    phraseIndex = targetIndex;

    // hold, then loop
    setTimeout(()=> queueTransitionTo((phraseIndex+1)%PHRASES.length), 900);
  }, Math.max(0, done - performance.now()));
}

/* Easing helpers */
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeIO   = t => (t<0.5) ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;

/* Animate per-letter */
function driveLetter(mesh, now){
  const a = mesh.userData.anim; if(!a) return;
  const t = clamp01((now - a.t0) / a.dur);
  if (t<=0) return;

  if (a.type === 'out'){
    const k = easeIO(t);
    mesh.rotation.y = a.dir * (k*Math.PI);
    mesh.material.opacity = 1 - k;
    mesh.position.y = k * 0.9;
    if (t>=1){ mesh.visible = false; mesh.userData.anim = null; }

  } else if (a.type === 'in'){
    const k = easeIO(t);
    mesh.rotation.y = a.dir * (-Math.PI*(1-k));
    mesh.material.opacity = k;
    mesh.position.y = (k-1) * 0.6;
    if (t>=1){ mesh.rotation.y=0; mesh.position.y=0; mesh.material.opacity=1; mesh.userData.anim=null; }
  }
}

/* Initialize */
loader.load("https://threejs.org/examples/fonts/helvetiker_bold.typeface.json", f=>{
  font = f;
  currentGroup = buildPhrase(PHRASES[phraseIndex]);
  root.add(currentGroup);

  // gentle idle motion
  scene.rotation.x = -0.06;

  // kick off the cycle
  setTimeout(()=> queueTransitionTo(1), 900);
});

/* Render loop */
let last = performance.now();
function tick(){
  requestAnimationFrame(tick);
  const now = performance.now();
  const dt = Math.min(0.05, (now - last)/1000); last = now;

  // idle bob & tiny sway
  const t = now*0.0016;
  root.position.y = Math.sin(t)*0.25;
  root.rotation.y = orbitY * 0.7 + Math.sin(t*0.8)*0.03;
  root.rotation.x = -0.06 + orbitX * 0.7;

  if (currentGroup) for (const m of currentGroup.children) driveLetter(m, now);
  if (nextGroup)    for (const m of nextGroup.children)    driveLetter(m, now);

  renderer.render(scene, camera);
}
tick();

/* Resize */
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  root.scale.setScalar(widthScale());
});
    `.trim();

    const scriptEl = document.createElement("script");
    scriptEl.type = "module";
    scriptEl.defer = true;
    scriptEl.textContent = code;
    document.body.appendChild(scriptEl);
    scriptElRef.current = scriptEl;

    return () => {
      // Clean up: remove injected script & style and the canvas/overlay
      if (scriptElRef.current) {
        scriptElRef.current.remove();
        scriptElRef.current = null;
      }
      if (styleElRef.current) {
        styleElRef.current.remove();
        styleElRef.current = null;
      }
      if (containerRef.current) {
        // remove children we rendered (canvas + overlay)
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }
    };
  }, []);

  return (
    <>
      {/* Host elements your original HTML expects */}
      <div ref={containerRef}>
        <canvas id="role3d" />
        <div className="overlay-ui">tap/click and drag to glance around</div>
      </div>
    </>
  );
}
