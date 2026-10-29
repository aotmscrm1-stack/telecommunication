import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import gsap from 'gsap'

const L = 1.6, R = 0.62 // pill = capsule: straight length L, end radius R  (half-length 1.42)
const BUTTON_SCALE = 0.82

/* ---------------- soft-body deformation (vertex) ---------------- */
const VERT_COMMON = /* glsl */ `
#include <common>
uniform float uTime, uHover, uPress; uniform vec2 uPoint, uVel; varying vec3 vObj;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 disp(vec3 p, vec3 n){
  float h=uHover; vec2 d=p.xy-uPoint; float g=exp(-dot(d,d)/.42);   // g = falloff around the cursor
  vec3 q=p;
  q.xy*=1.+.13*h+.06*uPress;                 // the whole pillow inflates
  q.z*=1.+.20*h-.5*uPress;                   // ...and flattens when pressed
  q.xy+=(uPoint-q.xy)*g*.2*h;                // fabric is pulled toward the cursor
  q.xy+=uPoint*.05*h;                        // body follows the cursor
  q.xy+=uVel*g*.06*h;                        // jelly lag from cursor velocity
  q+=n*g*(.26*h-.3*uPress);                  // bulge under cursor / dent on press
  float fw=smoothstep(.35,.9,abs(n.z));                                    // folds live on the faces, not the rim
  q+=n*fw*(vnoise(vec3(p.x*.7,p.y*3.4,uTime*.12))-.5)*(.07+.08*h);        // long horizontal folds
  q+=n*fw*(vnoise(vec3(p.x*2.2+4.,p.y*9.,uTime*.2))-.5)*.012*(1.+h);      // fine wrinkles
  q.y+=sin(p.x*2.+uTime*.8)*.01*(1.-h);      // idle breathing
  return q;
}`
const NORMAL_PATCH = /* glsl */ `
#include <beginnormal_vertex>
vec3 _n=normalize(normal); vec3 _t=normalize(cross(_n,abs(_n.y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.))); vec3 _b=cross(_n,_t);
vec3 _p0=disp(position,_n),_p1=disp(position+_t*.01,_n),_p2=disp(position+_b*.01,_n);
vec3 _dn=normalize(cross(_p1-_p0,_p2-_p0)); if(dot(_dn,_n)<0.) _dn=-_dn; objectNormal=_dn;`

/* ---------------- label printed into the fabric (fragment) ---------------- */
const FRAG_COMMON = /* glsl */ `
#include <common>
uniform sampler2D uText; uniform float uTextA; varying vec3 vObj;`
const FRAG_COLOR = /* glsl */ `
#include <color_fragment>
{ vec2 tuv=vec2(vObj.x/2.84+.5, vObj.y/1.42+.5);
  float ta=texture2D(uText,tuv).a*smoothstep(0.,.2,vObj.z)*uTextA;
  float g=fract(sin(dot(floor(vObj.xy*260.),vec2(12.9898,78.233)))*43758.5453);
  diffuseColor.rgb=mix(diffuseColor.rgb, vec3(.93,.95,1.)*(.78+.22*g), ta); }`

function makeText(label) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  const draw = () => {
    const x = c.getContext('2d'); x.clearRect(0, 0, 1024, 512); x.filter = 'blur(1.1px)'; x.fillStyle = '#fff'
    const len = (label || '').length || 1;
    const fontSize = Math.min(135, Math.floor(1050 / (len * 0.72)));
    x.font = `800 ${fontSize}px "Plus Jakarta Sans", "Inter", system-ui, sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(label, 512, 265);
    t.needsUpdate = true
  }
  draw();
  document.fonts?.load('800 135px "Plus Jakarta Sans"').then(draw).catch(() => {})
  return t
}
function makeFleece() { // fine fleece grain used as a bump map
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s
  const x = c.getContext('2d'), d = x.createImageData(s, s)
  for (let i = 0; i < d.data.length; i += 4) { const v = 90 + Math.random() * 165; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 }
  x.putImageData(d, 0, 0)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 7); t.anisotropy = 8
  return t
}

export default function PlushButton({ label = 'Explore', onClick, className = '', style = {}, width = '100%', height = '100%' }) {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current; const W = () => el.clientWidth, H = () => el.clientHeight
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W(), H())
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const pm = new THREE.PMREMGenerator(renderer)
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.2
    const cam = new THREE.PerspectiveCamera(35, W() / H(), 0.1, 50)
    const fit = () => {
      cam.aspect = W() / H();
      cam.position.set(0, 0, Math.max(2.4, 2.9 / cam.aspect));
      cam.updateProjectionMatrix();
    };
    fit()

    const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(3, 4, 5)
    const fill = new THREE.DirectionalLight(0x4a6cff, 0.8); fill.position.set(-4, -1, 3)
    const rim = new THREE.PointLight(0x3d7bff, 20, 12); rim.position.set(-3, 2, -2)
    scene.add(key, fill, rim, new THREE.HemisphereLight(0x8aa4ff, 0x05060c, 0.35))

    const U = { uTime: { value: 0 }, uHover: { value: 0 }, uPress: { value: 0 }, uPoint: { value: new THREE.Vector2() }, uVel: { value: new THREE.Vector2() }, uText: { value: makeText(label) }, uTextA: { value: 1 } }
    const geo = new THREE.CapsuleGeometry(R, L, 24, 96, 24); geo.rotateZ(Math.PI / 2); geo.scale(1, 1, 0.55)
    const mat = new THREE.MeshPhysicalMaterial({ color: '#1744b5', roughness: 1, metalness: 0, sheen: 1, sheenColor: new THREE.Color('#6f9bff'), sheenRoughness: 0.35, bumpMap: makeFleece(), bumpScale: 3 })
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U)
      sh.vertexShader = sh.vertexShader.replace('#include <common>', VERT_COMMON).replace('#include <beginnormal_vertex>', NORMAL_PATCH).replace('#include <begin_vertex>', 'vec3 transformed=_p0; vObj=position;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_BUMPMAP\nvBumpMapUv = position.xy*1.2 + position.z*vec2(.9,.4);\n#endif')
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', FRAG_COMMON).replace('#include <color_fragment>', FRAG_COLOR)
    }
    const mesh = new THREE.Mesh(geo, mat); scene.add(mesh)
    const proxy = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false })); scene.add(proxy) // hover hit-area (grows with the button, so no edge flicker)

    /* ---- interaction ---- */
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tilt = { x: 0, y: 0 }
    const st = { p: new THREE.Vector2(), v: new THREE.Vector2(), t: new THREE.Vector2() }
    let hover = false
    const setHover = (h) => {
      if (h === hover) return; hover = h
      proxy.scale.setScalar(BUTTON_SCALE * (h ? 1.18 : 1.0))
      gsap.to(U.uHover, { value: h ? 1 : 0, duration: h ? 1.1 : 1.3, ease: 'elastic.out(1,.4)', overwrite: true })
      gsap.to(U.uTextA, { value: h ? 0.78 : 1, duration: 0.5 })
      el.style.cursor = h ? 'pointer' : 'default'
    }
    const press = () => gsap.to(U.uPress, { value: 1, duration: 0.12, ease: 'power2.out', overwrite: true })
    const release = () => gsap.to(U.uPress, { value: 0, duration: 1.1, ease: 'elastic.out(1,.3)', overwrite: true })
    const onMove = (e) => {
      const r = renderer.domElement.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); tilt.x = ndc.x; tilt.y = ndc.y
      ray.setFromCamera(ndc, cam); const hit = ray.intersectObject(proxy)[0]
      if (hit) { const p = proxy.worldToLocal(hit.point.clone()); st.t.set(p.x, p.y) }
      setHover(!!hit)
    }
    const onDown = () => hover && press()
    const onUp = () => { release(); if (hover) onClick?.() }
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(); setTimeout(() => { release(); onClick?.() }, 120) } }
    const onFocus = () => { st.t.set(0, 0); setHover(true) }, onBlur = () => setHover(false)
    const cv = renderer.domElement
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown); addEventListener('pointerup', onUp); cv.addEventListener('pointerleave', () => setHover(false))
    el.addEventListener('keydown', onKey); el.addEventListener('focus', onFocus); el.addEventListener('blur', onBlur)

    gsap.ticker.lagSmoothing(0) // keep animations on wall-clock time even if a frame is slow
    /* ---- intro: it pops in like jelly ---- */
    mesh.scale.setScalar(0.001)
    proxy.scale.setScalar(BUTTON_SCALE)
    gsap.to(mesh.scale, { x: BUTTON_SCALE, y: BUTTON_SCALE, z: BUTTON_SCALE, duration: 1.8, ease: 'elastic.out(1,.55)', delay: 0.25 })

    /* ---- loop: spring-follow the cursor (underdamped => overshoot = jelly) ---- */
    const clock = new THREE.Clock()
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.033); U.uTime.value += dt
      for (const a of ['x', 'y']) { st.v[a] += ((st.t[a] - st.p[a]) * 150 - st.v[a] * 10) * dt; st.p[a] += st.v[a] * dt }
      U.uPoint.value.copy(st.p); U.uVel.value.set(THREE.MathUtils.clamp(st.v.x, -4, 4), THREE.MathUtils.clamp(st.v.y, -4, 4))
      mesh.rotation.y += (tilt.x * 0.14 - mesh.rotation.y) * 0.06; mesh.rotation.x += (-tilt.y * 0.1 - mesh.rotation.x) * 0.06
      proxy.rotation.copy(mesh.rotation)
      renderer.render(scene, cam)
    })
    const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); fit() }); ro.observe(el)
    return () => {
      renderer.setAnimationLoop(null); ro.disconnect(); gsap.killTweensOf([U.uHover, U.uPress, U.uTextA, mesh.scale])
      removeEventListener('pointerup', onUp); renderer.dispose(); geo.dispose(); mat.dispose(); el.removeChild(cv)
    }
  }, [label, onClick])

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={label}
      style={{
        position: 'relative',
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        outline: 'none',
        display: 'inline-block',
        ...style
      }}
      className={className}
    />
  )
}

/* ---------------- Backward Compatibility: Standard Tailwind Button (shadcn) ---------------- */
import * as React from 'react'
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 bg-red-600 text-white hover:bg-red-700 shadow-sm",
        outline:
          "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 shadow-sm",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants, PlushButton }

