'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { formatCurrency } from '@/lib/formats'

export type OrbitCategory = {
  id: string
  label: string
  value: number
  color: string
  children: { id: string; label: string; value: number; color: string }[]
}

const CAT_R = 3.8
const CHILD_R = 1.5
const DEFAULT_CAM = new THREE.Vector3(0, 2, 9)
const DEFAULT_TGT = new THREE.Vector3(0, 0, 0)

// ── Noise ────────────────────────────────────────────────────────────────
function _h(n: number) { const s = Math.sin(n) * 43758.5453; return s - Math.floor(s) }
function _n2(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  const a = _h(ix + iy * 57.1), b = _h(ix + 1 + iy * 57.1)
  const c = _h(ix + (iy + 1) * 57.1), d = _h(ix + 1 + (iy + 1) * 57.1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}
function fbm(x: number, y: number, seed: number, oct: number) {
  let v = 0, a = 0.5, f = 1
  for (let i = 0; i < oct; i++) {
    v += a * _n2(x * f + seed * 31.7, y * f + seed * 17.3)
    a *= 0.5; f *= 2
  }
  return v
}

// ── Canvas texture factory ───────────────────────────────────────────────
type RGBA = [number, number, number, number]
function mkTex(w: number, h: number, fill: (x: number, y: number) => RGBA): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, al] = fill(x, y); const i = (y * w + x) * 4
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = al
  }
  ctx.putImageData(img, 0, 0)
  return new THREE.CanvasTexture(cv)
}

function clamp(v: number) { return Math.max(0, Math.min(255, Math.round(v))) }

// Earth-like terrain with ocean / land / highlands / snow
function makePlanetTex(): THREE.CanvasTexture {
  return mkTex(512, 256, (x, y) => {
    const n = fbm(x / 512 * 6, y / 256 * 6, 1, 8)
    if (n < 0.40) { const t = n / 0.40; return [clamp(20 + t * 30), clamp(60 + t * 50), clamp(140 + t * 60), 255] }
    if (n < 0.48) return [80, 140, 130, 255]
    if (n < 0.65) { const t = (n - 0.48) / 0.17; return [clamp(50 + t * 60), clamp(110 + t * 70), clamp(30 + t * 15), 255] }
    if (n < 0.78) return [130, 100, 60, 255]
    const v = clamp(180 + (n - 0.78) / 0.22 * 75); return [v, v, v, 255]
  })
}

// Grayscale cloud density — used as alphaMap on a white mesh
function makeCloudTex(): THREE.CanvasTexture {
  return mkTex(512, 256, (x, y) => {
    const n = fbm(x / 512 * 8, y / 256 * 8, 42, 6)
    const v = clamp((n - 0.50) * 500)
    return [v, v, v, 255]
  })
}

// Per-satellite surface texture derived from its category color
function makeSatTex(color: string, seed: number): THREE.CanvasTexture {
  const c = new THREE.Color(color)
  return mkTex(256, 128, (x, y) => {
    const n1 = fbm(x / 256 * 5, y / 128 * 5, seed, 6)
    const n2 = fbm(x / 256 * 7.5 + 3, y / 128 * 7.5 + 7, seed + 5, 4)
    const v = (n1 * 0.7 + n2 * 0.3 - 0.5) * 0.65
    return [clamp((c.r + v) * 255), clamp((c.g + v * 0.8) * 255), clamp((c.b + v * 1.1) * 255), 255]
  })
}

// Roughness variation map
function makeRoughTex(seed: number, w = 256, h = 128): THREE.CanvasTexture {
  return mkTex(w, h, (x, y) => {
    const n = fbm(x / w * 4, y / h * 4, seed + 99, 5)
    const v = clamp(n * 255); return [v, v, v, 255]
  })
}

// ── Atmosphere rim-glow shader ───────────────────────────────────────────
const ATMO_V = `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const ATMO_F = `
  uniform vec3 gc; uniform float gi;
  varying vec3 vN; varying vec3 vV;
  void main() {
    float rim = 1.0 - max(0.0, dot(vN, vV));
    gl_FragColor = vec4(gc, pow(rim, 2.2) * gi);
  }
`

function AtmoGlow({ r, color, scale = 1.22, intensity = 0.85 }: {
  r: number; color: string; scale?: number; intensity?: number
}) {
  const u = useMemo(() => ({
    gc: { value: new THREE.Color(color) },
    gi: { value: intensity },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])
  return (
    <mesh scale={scale}>
      <sphereGeometry args={[r, 32, 32]} />
      <shaderMaterial
        uniforms={u}
        vertexShader={ATMO_V}
        fragmentShader={ATMO_F}
        transparent
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Planet ───────────────────────────────────────────────────────────────
function Planet({ clickable, onClick }: { clickable: boolean; onClick: () => void }) {
  const gRef = useRef<THREE.Group>(null)
  const sRef = useRef<THREE.Mesh>(null)
  const cRef = useRef<THREE.Mesh>(null)
  const [hov, setHov] = useState(false)

  const pTex = useMemo(makePlanetTex, [])
  const cloudTex = useMemo(makeCloudTex, [])
  const rTex = useMemo(() => makeRoughTex(1, 512, 256), [])
  useEffect(() => () => { pTex.dispose(); cloudTex.dispose(); rTex.dispose() }, [pTex, cloudTex, rTex])

  useFrame((_, dt) => {
    if (sRef.current) sRef.current.rotation.y += dt * 0.06
    if (cRef.current) cRef.current.rotation.y += dt * 0.10
    if (gRef.current) {
      const ts = clickable && hov ? 1.08 : 1
      gRef.current.scale.setScalar(THREE.MathUtils.lerp(gRef.current.scale.x, ts, 0.1))
    }
  })

  return (
    <group
      ref={gRef}
      onClick={clickable ? (e) => { e.stopPropagation(); onClick() } : undefined}
      onPointerOver={clickable ? () => { setHov(true); document.body.style.cursor = 'pointer' } : undefined}
      onPointerOut={clickable ? () => { setHov(false); document.body.style.cursor = 'auto' } : undefined}
    >
      {/* Surface */}
      <mesh ref={sRef}>
        <sphereGeometry args={[0.85, 64, 64]} />
        <meshStandardMaterial map={pTex} roughnessMap={rTex} roughness={0.82} metalness={0} />
      </mesh>
      {/* Cloud layer */}
      <mesh ref={cRef} scale={1.02}>
        <sphereGeometry args={[0.85, 48, 48]} />
        <meshStandardMaterial
          alphaMap={cloudTex}
          color="#ffffff"
          transparent
          roughness={1}
          metalness={0}
          opacity={0.75}
          depthWrite={false}
        />
      </mesh>
      {/* Atmosphere */}
      <AtmoGlow r={0.85} color="#7dd3fc" scale={1.22} intensity={0.85} />
    </group>
  )
}

// ── Category satellite ───────────────────────────────────────────────────
function CatSat({
  posRef, size, color, dimmed, onClick, seed,
}: {
  posRef: THREE.Vector3; size: number; color: string
  dimmed: boolean; onClick: () => void; seed: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  const [hov, setHov] = useState(false)

  const sTex = useMemo(() => makeSatTex(color, seed), [color, seed])
  const rTex = useMemo(() => makeRoughTex(seed), [seed])
  useEffect(() => () => { sTex.dispose(); rTex.dispose() }, [sTex, rTex])

  useFrame(() => {
    if (!ref.current) return
    ref.current.position.copy(posRef)
    ref.current.rotation.y += 0.004
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, hov ? 1.14 : 1, 0.1))
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, dimmed ? 0.15 : 1, 0.07)
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, hov ? 0.45 : 0.18, 0.1)
  })

  return (
    <mesh
      ref={ref}
      onClick={(e) => { e.stopPropagation(); if (!dimmed) onClick() }}
      onPointerOver={() => { if (!dimmed) { setHov(true); document.body.style.cursor = 'pointer' } }}
      onPointerOut={() => { setHov(false); document.body.style.cursor = 'auto' }}
    >
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        map={sTex}
        roughnessMap={rTex}
        roughness={0.65}
        metalness={0.05}
        emissive={color}
        emissiveIntensity={0.18}
        transparent
        opacity={1}
      />
    </mesh>
  )
}

// ── Child satellite ──────────────────────────────────────────────────────
function ChildSat({
  parentPosRef, anglesRef, index, size, color,
}: {
  parentPosRef: React.MutableRefObject<THREE.Vector3>
  anglesRef: React.MutableRefObject<number[]>
  index: number; size: number; color: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  const born = useRef(0)

  useFrame((_, dt) => {
    if (!ref.current) return
    born.current = Math.min(1, born.current + dt * 1.6)
    ref.current.scale.setScalar(born.current)
    const ang = anglesRef.current[index] ?? 0
    const p = parentPosRef.current
    ref.current.position.set(
      p.x + Math.cos(ang) * CHILD_R,
      p.y + Math.sin(ang * 0.55) * 0.38,
      p.z + Math.sin(ang) * CHILD_R
    )
  })

  return (
    <mesh ref={ref} scale={0}>
      <sphereGeometry args={[size, 20, 20]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.38} roughness={0.3} />
    </mesh>
  )
}

// ── Scene ────────────────────────────────────────────────────────────────
function Scene({
  categories, total, selected, onSelect, onBack,
}: {
  categories: OrbitCategory[]; total: number
  selected: OrbitCategory | null
  onSelect: (cat: OrbitCategory) => void
  onBack: () => void
}) {
  const { camera } = useThree()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctrlRef = useRef<any>(null)

  const orbitAng = useRef(0)
  const childAngs = useRef<number[]>([])
  const catPosRefs = useRef(categories.map(() => new THREE.Vector3()))
  const selPosRef = useRef(new THREE.Vector3())
  const camPos = useRef(DEFAULT_CAM.clone())
  const camTgt = useRef(DEFAULT_TGT.clone())

  const maxVal = Math.max(...categories.map(c => Math.abs(c.value)), 1)

  useFrame((_, dt) => {
    orbitAng.current += dt * 0.14
    childAngs.current = childAngs.current.map((a, i) => a + dt * (0.2 + i * 0.04))

    categories.forEach((_, i) => {
      const base = (i / categories.length) * Math.PI * 2
      const ang = base + orbitAng.current
      catPosRefs.current[i].set(
        Math.cos(ang) * CAT_R,
        Math.sin(ang * 0.65) * 0.9,
        Math.sin(ang) * CAT_R
      )
    })

    const selIdx = selected ? categories.findIndex(c => c.id === selected.id) : -1
    const isSelected = selected !== null && selIdx >= 0

    if (isSelected) {
      selPosRef.current.copy(catPosRefs.current[selIdx])
      const dest = selPosRef.current.clone().multiplyScalar(2.3)
      dest.y += 0.6
      camPos.current.lerp(dest, 0.04)
      camTgt.current.lerp(selPosRef.current, 0.04)
      camera.position.copy(camPos.current)
      camera.lookAt(camTgt.current)
      if (ctrlRef.current) {
        ctrlRef.current.enabled = false
        ctrlRef.current.target.copy(camTgt.current)
      }
    } else {
      const dist = camPos.current.distanceTo(DEFAULT_CAM)
      if (dist > 0.4) {
        camPos.current.lerp(DEFAULT_CAM, 0.05)
        camTgt.current.lerp(DEFAULT_TGT, 0.05)
        camera.position.copy(camPos.current)
        camera.lookAt(camTgt.current)
        if (ctrlRef.current) {
          ctrlRef.current.enabled = false
          ctrlRef.current.target.copy(camTgt.current)
        }
      } else {
        if (ctrlRef.current && !ctrlRef.current.enabled) {
          camPos.current.copy(camera.position)
          ctrlRef.current.enabled = true
        }
      }
    }
  })

  return (
    <>
      <OrbitControls ref={ctrlRef} enablePan={false} minDistance={5} maxDistance={14} />
      <ambientLight intensity={0.35} />
      <pointLight position={[8, 8, 8]} intensity={2.4} color="#fff5e0" />
      <pointLight position={[-5, -4, -6]} intensity={0.6} color="#60a5fa" />

      <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.4} />

      {/* Orbital ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CAT_R, 0.007, 6, 100]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
      </mesh>

      <Planet clickable={!!selected} onClick={onBack} />

      {categories.map((cat, i) => (
        <CatSat
          key={cat.id}
          posRef={catPosRefs.current[i]}
          size={0.22 + (Math.abs(cat.value) / maxVal) * 0.48}
          color={cat.color}
          seed={i}
          dimmed={!!selected && selected.id !== cat.id}
          onClick={() => {
            childAngs.current = (cat.children ?? []).map((_, j) =>
              (j / Math.max(cat.children.length, 1)) * Math.PI * 2
            )
            onSelect(cat)
          }}
        />
      ))}

      {selected && selected.children.map((child, i) => {
        const maxChild = Math.max(...selected.children.map(c => Math.abs(c.value)), 1)
        return (
          <ChildSat
            key={child.id}
            parentPosRef={selPosRef}
            anglesRef={childAngs}
            index={i}
            size={0.07 + (Math.abs(child.value) / maxChild) * 0.17}
            color={child.color}
          />
        )
      })}
    </>
  )
}

// ── Info panel ───────────────────────────────────────────────────────────
function InfoPanel({ selected }: { selected: OrbitCategory | null }) {
  if (!selected) return null
  return (
    <div className="absolute top-4 right-4 w-[210px] bg-[#111113]/90 backdrop-blur border border-white/[0.08] rounded-2xl p-4 space-y-3 pointer-events-auto">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
        <span className="font-mono text-[10px] tracking-[1.5px] uppercase text-muted-foreground">{selected.label}</span>
      </div>
      <p className="font-mono text-[19px] font-medium text-foreground tabular-nums leading-none">
        {selected.value < 0 ? '−' : ''}{formatCurrency(Math.abs(selected.value))}
      </p>
      {selected.children.length > 0 && (
        <div className="space-y-0.5 border-t border-white/[0.06] pt-2 max-h-[200px] overflow-y-auto">
          {selected.children.map(child => (
            <div key={child.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: child.color }} />
                <span className="text-[11.5px] text-foreground/80 truncate">{child.label}</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground ml-2 shrink-0 tabular-nums">
                {formatCurrency(Math.abs(child.value))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Export ───────────────────────────────────────────────────────────────
export function OrbitChart3D({ categories, total }: { categories: OrbitCategory[]; total: number }) {
  const [selected, setSelected] = useState<OrbitCategory | null>(null)
  const handleBack = useCallback(() => setSelected(null), [])

  return (
    <div className="relative w-full h-[500px] md:h-[620px]">
      <Canvas
        camera={{ position: [0, 2, 9], fov: 60 }}
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Scene
          categories={categories}
          total={total}
          selected={selected}
          onSelect={setSelected}
          onBack={handleBack}
        />
      </Canvas>

      {selected && (
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 font-mono text-[10px] tracking-[0.5px] uppercase text-muted-foreground hover:text-foreground border border-white/[0.08] rounded-lg px-3 py-1.5 bg-[#0f0f11]/80 backdrop-blur transition-colors"
        >
          ← Torna
        </button>
      )}

      {!selected && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[1px] uppercase text-muted-foreground/40 pointer-events-none select-none">
          Trascina per ruotare · Clicca un satellite per esplorare
        </p>
      )}

      <InfoPanel selected={selected} />
    </div>
  )
}
