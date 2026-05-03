'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import { formatCurrency } from '@/lib/formats'

export type OrbitAsset = {
  id: string
  label: string
  value: number
  color: string
}

export type OrbitRing = {
  id: string
  label: string
  radius: number
  accentColor: string
  assets: OrbitAsset[]
}

const DEFAULT_CAM = new THREE.Vector3(0, 3.2, 10.5)
const DEFAULT_TGT = new THREE.Vector3(0, 0, 0)
const LIME = '#bef264'

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

// ── Vault sphere (centro) ────────────────────────────────────────────────
function VaultSphere({ pulse }: { pulse: boolean }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.rotation.y = t * 0.04
    const mat = ref.current.material as THREE.MeshStandardMaterial
    const target = pulse ? 0.35 + Math.sin(t * 1.5) * 0.08 : 0.18
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.08)
  })

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.95, 64, 64]} />
        <meshStandardMaterial
          color="#1c1c1f"
          emissive={LIME}
          emissiveIntensity={0.18}
          metalness={0.45}
          roughness={0.35}
        />
      </mesh>
      <AtmoGlow r={0.95} color={LIME} scale={1.24} intensity={0.6} />
      <AtmoGlow r={0.95} color={LIME} scale={1.45} intensity={0.25} />
    </group>
  )
}

// ── Ring geometry (visual track) ─────────────────────────────────────────
function RingTrack({ radius, color, dimmed }: { radius: number; color: string; dimmed: boolean }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (!matRef.current) return
    matRef.current.opacity = THREE.MathUtils.lerp(
      matRef.current.opacity,
      dimmed ? 0.03 : 0.15,
      0.1
    )
  })
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 128]} />
      <meshBasicMaterial ref={matRef} color={color} transparent opacity={0.15} />
    </mesh>
  )
}

// ── Satellite (single asset) ─────────────────────────────────────────────
function Satellite({
  asset, posRef, size, dimmed, onClick, onHover, labelScale, selected,
}: {
  asset: OrbitAsset
  posRef: THREE.Vector3
  size: number
  dimmed: boolean
  onClick: () => void
  onHover: (hovered: boolean) => void
  labelScale: number
  selected: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const [hov, setHov] = useState(false)

  useFrame(() => {
    if (!group.current || !mesh.current) return
    group.current.position.copy(posRef)
    mesh.current.rotation.y += 0.004
    const ts = hov || selected ? 1.18 : 1
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, ts, 0.1))
    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, dimmed ? 0.18 : 1, 0.08)
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, hov || selected ? 0.55 : 0.22, 0.1)
  })

  return (
    <group ref={group}>
      <mesh
        ref={mesh}
        onClick={(e) => { e.stopPropagation(); if (!dimmed) onClick() }}
        onPointerOver={() => { if (!dimmed) { setHov(true); onHover(true); document.body.style.cursor = 'pointer' } }}
        onPointerOut={() => { setHov(false); onHover(false); document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[size, 28, 28]} />
        <meshStandardMaterial
          color={asset.color}
          emissive={asset.color}
          emissiveIntensity={0.22}
          roughness={0.35}
          metalness={0.15}
          transparent
          opacity={1}
        />
      </mesh>
      {/* Label HTML overlay */}
      <Html
        position={[0, size + 0.22, 0]}
        center
        distanceFactor={labelScale}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none', opacity: dimmed ? 0.25 : 1, transition: 'opacity 200ms' }}
      >
        <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
          <div
            className="font-mono text-[10px] tracking-[-0.2px] text-foreground px-1.5 py-0.5 rounded-md"
            style={{
              background: 'rgba(9,9,11,0.72)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {asset.label.length > 18 ? asset.label.slice(0, 17) + '…' : asset.label}
          </div>
          <div className="font-mono text-[9px] tabular-nums" style={{ color: asset.color, opacity: 0.85 }}>
            {formatCurrency(Math.abs(asset.value))}
          </div>
        </div>
      </Html>
    </group>
  )
}

// ── Shooting star ────────────────────────────────────────────────────────
function ShootingStar({ delay }: { delay: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const tailRef = useRef<THREE.Mesh>(null)
  const start = useRef(new THREE.Vector3())
  const dir = useRef(new THREE.Vector3())
  const life = useRef(-delay)

  useFrame((_, dt) => {
    if (!ref.current || !tailRef.current) return
    life.current += dt
    const mat = ref.current.material as THREE.MeshBasicMaterial
    const tailMat = tailRef.current.material as THREE.MeshBasicMaterial

    if (life.current < 0) {
      mat.opacity = 0
      tailMat.opacity = 0
      return
    }
    if (life.current > 2.2) {
      // respawn
      const a = Math.random() * Math.PI * 2
      const r = 15 + Math.random() * 8
      start.current.set(Math.cos(a) * r, 4 + Math.random() * 3, Math.sin(a) * r - 5)
      dir.current.set(
        -Math.cos(a) * 0.6 - Math.random() * 0.3,
        -0.2 - Math.random() * 0.1,
        -Math.sin(a) * 0.6 + (Math.random() - 0.5) * 0.2
      )
      life.current = 0
      ref.current.position.copy(start.current)
      tailRef.current.position.copy(start.current)
      const travel = 5 + Math.random() * 5
      // gap before next
      life.current = -Math.random() * travel
    }

    const t = life.current
    if (t >= 0) {
      ref.current.position.x = start.current.x + dir.current.x * t * 8
      ref.current.position.y = start.current.y + dir.current.y * t * 8
      ref.current.position.z = start.current.z + dir.current.z * t * 8
      tailRef.current.position.copy(ref.current.position)
      const fade = Math.sin(Math.min(1, t / 2) * Math.PI)
      mat.opacity = fade
      tailMat.opacity = fade * 0.45
      tailRef.current.lookAt(start.current)
    }
  })

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>
      <mesh ref={tailRef}>
        <cylinderGeometry args={[0.005, 0.03, 0.9, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>
    </>
  )
}

// ── Scene ────────────────────────────────────────────────────────────────
function Scene({
  rings, selected, onSelect, onBack,
}: {
  rings: OrbitRing[]
  selected: OrbitAsset | null
  onSelect: (asset: OrbitAsset, ringId: string) => void
  onBack: () => void
}) {
  const { camera } = useThree()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctrlRef = useRef<any>(null)
  const [hoveredRing, setHoveredRing] = useState<string | null>(null)

  const orbitAng = useRef(0)
  const camPos = useRef(DEFAULT_CAM.clone())
  const camTgt = useRef(DEFAULT_TGT.clone())

  // Compute positions for every asset
  type SatRef = { ringId: string; asset: OrbitAsset; radius: number; pos: THREE.Vector3; baseAngle: number; yBias: number }
  const sats = useMemo<SatRef[]>(() => {
    const out: SatRef[] = []
    rings.forEach((ring, ringIdx) => {
      const n = ring.assets.length
      ring.assets.forEach((asset, i) => {
        const baseAngle = (i / Math.max(n, 1)) * Math.PI * 2 + ringIdx * 0.37
        out.push({
          ringId: ring.id,
          asset,
          radius: ring.radius,
          pos: new THREE.Vector3(),
          baseAngle,
          // Inclinazione verticale leggera alternata per ring per non avere pianeti perfettamente piatti
          yBias: ringIdx === 0 ? 0.6 : ringIdx === 1 ? 0.9 : 1.1,
        })
      })
    })
    return out
  }, [rings])

  const maxValOverall = useMemo(
    () => Math.max(...sats.map(s => Math.abs(s.asset.value)), 1),
    [sats]
  )

  useFrame((_, dt) => {
    // slower orbit when something is hovered/selected
    const speed = selected ? 0.02 : hoveredRing ? 0.04 : 0.08
    orbitAng.current += dt * speed

    sats.forEach((s, idx) => {
      const ang = s.baseAngle + orbitAng.current * (1 + idx * 0.01)
      s.pos.set(
        Math.cos(ang) * s.radius,
        Math.sin(ang * 0.65 + idx * 0.7) * s.yBias * 0.35,
        Math.sin(ang) * s.radius
      )
    })

    // Camera behaviour
    if (selected) {
      const sel = sats.find(s => s.asset.id === selected.id)
      if (sel) {
        const dest = sel.pos.clone().normalize().multiplyScalar(sel.radius + 2.2)
        dest.y += 0.6
        camPos.current.lerp(dest, 0.05)
        camTgt.current.lerp(sel.pos, 0.08)
        camera.position.copy(camPos.current)
        camera.lookAt(camTgt.current)
        if (ctrlRef.current) {
          ctrlRef.current.enabled = false
          ctrlRef.current.target.copy(camTgt.current)
        }
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

  // Click on empty space → deselect
  const handleBackgroundClick = useCallback(() => {
    if (selected) onBack()
  }, [selected, onBack])

  return (
    <>
      <OrbitControls ref={ctrlRef} enablePan={false} minDistance={6} maxDistance={18} enableDamping dampingFactor={0.08} />
      <ambientLight intensity={0.4} />
      <pointLight position={[8, 8, 8]} intensity={2.2} color="#fff5e0" />
      <pointLight position={[-6, -3, -7]} intensity={0.6} color="#7dd3fc" />
      <pointLight position={[0, 0, 0]} intensity={0.8} color={LIME} distance={5} decay={2} />

      <Stars radius={90} depth={50} count={1800} factor={3.2} saturation={0} fade speed={0.3} />

      {/* Shooting stars staggered */}
      <ShootingStar delay={3} />
      <ShootingStar delay={9} />
      <ShootingStar delay={17} />

      {/* Click-catcher background */}
      <mesh position={[0, 0, -12]} onClick={handleBackgroundClick}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Ring tracks */}
      {rings.map(ring => (
        <RingTrack
          key={ring.id}
          radius={ring.radius}
          color={ring.accentColor}
          dimmed={hoveredRing !== null && hoveredRing !== ring.id}
        />
      ))}

      <VaultSphere pulse={selected !== null} />

      {sats.map((s) => {
        const size = 0.16 + Math.pow(Math.abs(s.asset.value) / maxValOverall, 0.5) * 0.38
        const isOtherRing = hoveredRing !== null && hoveredRing !== s.ringId
        const isOtherAsset = selected !== null && selected.id !== s.asset.id
        const dimmed = isOtherRing || isOtherAsset
        return (
          <Satellite
            key={s.asset.id}
            asset={s.asset}
            posRef={s.pos}
            size={size}
            dimmed={dimmed}
            selected={selected?.id === s.asset.id}
            labelScale={selected?.id === s.asset.id ? 6 : 8}
            onClick={() => onSelect(s.asset, s.ringId)}
            onHover={(h) => setHoveredRing(h ? s.ringId : null)}
          />
        )
      })}
    </>
  )
}

// ── Info panel ───────────────────────────────────────────────────────────
function InfoPanel({ selected, ringLabel }: { selected: OrbitAsset | null; ringLabel: string | null }) {
  if (!selected) return null
  return (
    <div
      className="absolute md:top-4 md:right-4 md:w-[260px] max-md:left-4 max-md:right-4 max-md:bottom-4 rounded-2xl p-4 space-y-3 pointer-events-auto border border-white/[0.08]"
      style={{
        background: 'rgba(15,15,17,0.82)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
        <span className="font-mono text-[10px] tracking-[1.5px] uppercase text-muted-foreground">{ringLabel ?? 'Asset'}</span>
      </div>
      <p className="text-[15px] font-medium text-foreground tracking-[-0.2px] leading-tight">
        {selected.label}
      </p>
      <p className="font-mono text-[22px] font-medium tabular-nums leading-none" style={{ color: selected.color }}>
        {selected.value < 0 ? '−' : ''}{formatCurrency(Math.abs(selected.value))}
      </p>
    </div>
  )
}

// ── Export ───────────────────────────────────────────────────────────────
export function OrbitChart3D({ rings, total }: { rings: OrbitRing[]; total: number }) {
  const [selected, setSelected] = useState<OrbitAsset | null>(null)
  const [selectedRingId, setSelectedRingId] = useState<string | null>(null)

  const handleSelect = useCallback((asset: OrbitAsset, ringId: string) => {
    setSelected(asset)
    setSelectedRingId(ringId)
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
    setSelectedRingId(null)
  }, [])

  const ringLabel = useMemo(
    () => rings.find(r => r.id === selectedRingId)?.label ?? null,
    [rings, selectedRingId]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleBack() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleBack])

  return (
    <div
      className="relative w-full h-[520px] md:h-[640px] rounded-2xl overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 28% 35%, rgba(190,242,100,0.05) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 72% 65%, rgba(167,139,250,0.045) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 50% 50%, #0a0a0d 0%, #060608 70%, #050507 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 3.2, 10.5], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene
          rings={rings}
          selected={selected}
          onSelect={handleSelect}
          onBack={handleBack}
        />
      </Canvas>

      {/* Centered total overlay (hidden when asset selected) */}
      {!selected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <p className="font-mono text-[9.5px] md:text-[10.5px] uppercase tracking-[2.5px] text-muted-foreground mb-1">
            Patrimonio netto
          </p>
          <p className="font-mono text-[26px] md:text-[34px] font-medium text-foreground tabular-nums tracking-[-0.8px] leading-none">
            {formatCurrency(total)}
          </p>
        </div>
      )}

      {/* Back button */}
      {selected && (
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 font-mono text-[10px] tracking-[0.5px] uppercase text-muted-foreground hover:text-foreground border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
          style={{
            background: 'rgba(15,15,17,0.78)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          ← Torna
        </button>
      )}

      {/* Hint (hidden when selected) */}
      {!selected && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[1px] uppercase text-muted-foreground/40 pointer-events-none select-none whitespace-nowrap">
          Trascina per ruotare · Clicca un asset per esplorare
        </p>
      )}

      <InfoPanel selected={selected} ringLabel={ringLabel} />
    </div>
  )
}
