'use client'

import { useRef, useState, useCallback } from 'react'
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

// ── Planet ──────────────────────────────────────────────────────────────
function Planet({ clickable, onClick }: { clickable: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Mesh>(null)
  const [hov, setHov] = useState(false)

  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.y += dt * 0.08
    const ts = clickable && hov ? 1.08 : 1
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, ts, 0.1))
  })

  return (
    <mesh
      ref={ref}
      onClick={clickable ? (e) => { e.stopPropagation(); onClick() } : undefined}
      onPointerOver={clickable ? () => { setHov(true); document.body.style.cursor = 'pointer' } : undefined}
      onPointerOut={clickable ? () => { setHov(false); document.body.style.cursor = 'auto' } : undefined}
    >
      <sphereGeometry args={[0.85, 64, 64]} />
      <meshStandardMaterial
        color="#bef264" emissive="#bef264" emissiveIntensity={0.18} roughness={0.35} metalness={0.1}
      />
    </mesh>
  )
}

// ── Category satellite ──────────────────────────────────────────────────
function CatSat({
  posRef, size, color, dimmed, onClick,
}: {
  posRef: THREE.Vector3
  size: number; color: string; dimmed: boolean; onClick: () => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  const [hov, setHov] = useState(false)

  useFrame(() => {
    if (!ref.current) return
    ref.current.position.copy(posRef)
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, hov ? 1.14 : 1, 0.1))
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, dimmed ? 0.15 : 1, 0.07)
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, hov ? 0.55 : 0.28, 0.1)
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
        color={color} emissive={color} emissiveIntensity={0.28}
        roughness={0.25} metalness={0.1} transparent opacity={1}
      />
    </mesh>
  )
}

// ── Child satellite ─────────────────────────────────────────────────────
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

// ── Scene ───────────────────────────────────────────────────────────────
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
      <ambientLight intensity={0.3} />
      <pointLight position={[8, 8, 8]} intensity={2.2} />
      <pointLight position={[-5, -4, -6]} intensity={0.5} color="#60a5fa" />

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

// ── Info panel ──────────────────────────────────────────────────────────
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

// ── Export ──────────────────────────────────────────────────────────────
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
