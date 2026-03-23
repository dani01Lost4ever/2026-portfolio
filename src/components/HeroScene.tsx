import { useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Float } from '@react-three/drei'
import * as THREE from 'three'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MouseRef {
  current: { x: number; y: number }
}

// ─── Central morphing blob ────────────────────────────────────────────────────

function Blob({ mouseRef }: { mouseRef: MouseRef }) {
  const mesh = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    mesh.current.rotation.x = t * 0.07 - mouseRef.current.y * 0.35
    mesh.current.rotation.y = t * 0.11 + mouseRef.current.x * 0.35
  })

  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.5}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.55, 2]} />
        <MeshDistortMaterial
          color="#5465ff"
          distort={0.32}
          speed={1.8}
          roughness={0.35}
          metalness={0.1}
          emissive="#2535bb"
          emissiveIntensity={0.45}
        />
      </mesh>
    </Float>
  )
}

// ─── Orbiting ring ────────────────────────────────────────────────────────────

function Ring({
  radius,
  speed,
  tilt,
  color = '#5465ff',
  opacity = 0.22,
}: {
  radius: number
  speed: number
  tilt: number
  color?: string
  opacity?: number
}) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    ref.current.rotation.z = clock.elapsedTime * speed
  })
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.007, 2, 100]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

// ─── Floating particles ───────────────────────────────────────────────────────

function Particles({ count = 160 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!)

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 2.6 + Math.random() * 2.0
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [count])

  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.elapsedTime * 0.045
    ref.current.rotation.x = clock.elapsedTime * 0.02
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#a8ff40"
        size={0.026}
        sizeAttenuation
        transparent
        opacity={0.65}
      />
    </points>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({ mouseRef }: { mouseRef: MouseRef }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]}   intensity={4}   color="#ffffff" />
      <pointLight position={[2, 2, 3]}   intensity={2}   color="#5465ff" />
      <pointLight position={[-4, -3, -3]} intensity={0.8} color="#a8ff40" />

      <Blob mouseRef={mouseRef} />

      <Ring radius={2.35} speed={0.28}  tilt={Math.PI / 4}  />
      <Ring radius={3.05} speed={-0.18} tilt={-Math.PI / 5} color="#a8ff40" opacity={0.14} />

      <Particles />
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function HeroScene() {
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div className="hero-scene">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 42 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene mouseRef={mouseRef} />
      </Canvas>
    </div>
  )
}
