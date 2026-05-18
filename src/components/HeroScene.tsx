/**
 * HeroScene — Spline-style floating geometric shapes
 *
 * Shapes float independently, react to mouse (parallax group tilt),
 * and can be dragged anywhere in the hero section.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ─── Shape config ─────────────────────────────────────────────────────────────

interface ShapeConfig {
  id: number
  geometry: 'torus' | 'sphere' | 'octahedron' | 'icosahedron' | 'torusKnot'
  position: [number, number, number]
  color: string
  emissive: string
  emissiveIntensity: number
  roughness: number
  metalness: number
  scale: number
  floatSpeed: number
  floatAmp: number
  floatPhase: number
  rotAxis: [number, number, number]
  rotSpeed: number
  // Distort breathes the geometry — speed = how fast it wobbles,
  // distort = how far each vertex strays from the base form.
  distortSpeed: number
  distortAmount: number
}

// Palette: warm graphite bases + amber/ochre/terracotta/cream emissives.
// Distort gives each shape its own breathing pattern — speeds and amounts
// are deliberately out of phase so the whole field never pulses in unison.
// Reads as: polished bronze and lacquered terracotta, slightly molten.
const SHAPES: ShapeConfig[] = [
  {
    id: 0,
    geometry: 'sphere',
    position: [1.4, 0.5, 0],
    color: '#1c1410',
    emissive: '#e8923e',         // amber
    emissiveIntensity: 0.65,
    roughness: 0.18,
    metalness: 0.86,
    scale: 1.45,
    floatSpeed: 0.55,
    floatAmp: 0.22,
    floatPhase: 0,
    rotAxis: [0.3, 1, 0.2],
    rotSpeed: 0.004,
    distortSpeed: 2.4,
    distortAmount: 0.42,
  },
  {
    id: 1,
    geometry: 'sphere',
    position: [-1.6, 0.9, -0.3],
    color: '#1a1208',
    emissive: '#d6b75d',         // ochre
    emissiveIntensity: 0.55,
    roughness: 0.10,
    metalness: 0.88,
    scale: 1.10,
    floatSpeed: 0.42,
    floatAmp: 0.26,
    floatPhase: 1.5,
    rotAxis: [0.2, 0.7, 0.5],
    rotSpeed: 0.003,
    distortSpeed: 1.8,
    distortAmount: 0.30,
  },
  {
    id: 2,
    geometry: 'octahedron',
    position: [0.6, -1.2, 0.3],
    color: '#22150a',
    emissive: '#f0a04a',         // warm amber
    emissiveIntensity: 0.7,
    roughness: 0.14,
    metalness: 0.82,
    scale: 0.95,
    floatSpeed: 0.78,
    floatAmp: 0.17,
    floatPhase: 2.2,
    rotAxis: [1, 0.4, 0.3],
    rotSpeed: 0.012,             // spins faster — the energetic one
    distortSpeed: 3.2,
    distortAmount: 0.22,         // less distort to preserve facets
  },
  {
    id: 3,
    geometry: 'icosahedron',
    position: [-0.4, -0.6, -0.2],
    color: '#2a1408',
    emissive: '#b85c2a',         // terracotta
    emissiveIntensity: 0.6,
    roughness: 0.20,
    metalness: 0.78,
    scale: 0.85,
    floatSpeed: 0.52,
    floatAmp: 0.21,
    floatPhase: 3.8,
    rotAxis: [0.5, 0.8, 0.4],
    rotSpeed: 0.006,
    distortSpeed: 1.4,
    distortAmount: 0.24,
  },
  {
    id: 4,
    geometry: 'torusKnot',
    position: [2.0, -0.2, -0.4],
    color: '#1c1208',
    emissive: '#e8923e',         // amber (matches CSS accent)
    emissiveIntensity: 0.65,
    roughness: 0.16,
    metalness: 0.82,
    scale: 0.95,
    floatSpeed: 0.68,
    floatAmp: 0.19,
    floatPhase: 0.8,
    rotAxis: [0.6, 1, 0.3],
    rotSpeed: 0.014,             // signature motion — the knot tumbles
    distortSpeed: 2.0,
    distortAmount: 0.22,
  },
  {
    id: 5,
    geometry: 'sphere',
    position: [1.8, 1.5, -0.6],
    color: '#1a1610',
    emissive: '#ece9df',         // bone / cream pearl
    emissiveIntensity: 0.45,
    roughness: 0.08,
    metalness: 0.9,
    scale: 0.65,
    floatSpeed: 0.6,
    floatAmp: 0.16,
    floatPhase: 4.5,
    rotAxis: [0.3, 0.6, 0.8],
    rotSpeed: 0.004,
    distortSpeed: 1.2,
    distortAmount: 0.34,
  },
]

// ─── Individual shape ─────────────────────────────────────────────────────────

function Shape({ config }: { config: ShapeConfig }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { camera, gl } = useThree()

  // Base position the shape floats around (updated on drop)
  const base = useRef(new THREE.Vector3(...config.position))

  // Drag state — all refs to avoid re-renders
  const dragging = useRef(false)
  const dragPlane = useRef(new THREE.Plane())
  const intersection = useRef(new THREE.Vector3())
  const offset = useRef(new THREE.Vector3())
  const rc = useRef(new THREE.Raycaster())

  const rotAxisVec = useMemo(
    () => new THREE.Vector3(...config.rotAxis).normalize(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useFrame(({ clock }) => {
    if (!meshRef.current || dragging.current) return
    const t = clock.elapsedTime
    meshRef.current.position.x =
      base.current.x + Math.cos(t * config.floatSpeed * 0.7 + config.floatPhase) * config.floatAmp * 0.3
    meshRef.current.position.y =
      base.current.y + Math.sin(t * config.floatSpeed + config.floatPhase) * config.floatAmp
    meshRef.current.position.z = base.current.z
    meshRef.current.rotateOnWorldAxis(rotAxisVec, config.rotSpeed)
  })

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    dragging.current = true

    // Build drag plane facing camera
    const normal = new THREE.Vector3()
    camera.getWorldDirection(normal).negate()
    dragPlane.current.setFromNormalAndCoplanarPoint(normal, meshRef.current.position)

    // Compute click point on plane
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    rc.current.setFromCamera(new THREE.Vector2(x, y), camera)
    if (rc.current.ray.intersectPlane(dragPlane.current, intersection.current)) {
      offset.current.subVectors(meshRef.current.position, intersection.current)
    }

    function onMove(ev: PointerEvent) {
      const r = gl.domElement.getBoundingClientRect()
      const mx = ((ev.clientX - r.left) / r.width) * 2 - 1
      const my = -((ev.clientY - r.top) / r.height) * 2 + 1
      rc.current.setFromCamera(new THREE.Vector2(mx, my), camera)
      if (rc.current.ray.intersectPlane(dragPlane.current, intersection.current)) {
        meshRef.current.position.copy(intersection.current.clone().add(offset.current))
      }
    }

    function onUp() {
      dragging.current = false
      // Shape floats from wherever it was dropped
      base.current.copy(meshRef.current.position)
      gl.domElement.removeEventListener('pointermove', onMove)
      gl.domElement.removeEventListener('pointerup', onUp)
    }

    gl.domElement.addEventListener('pointermove', onMove)
    gl.domElement.addEventListener('pointerup', onUp)
  }

  return (
    <mesh
      ref={meshRef}
      position={config.position}
      scale={config.scale}
      onPointerDown={onPointerDown}
    >
      {/* High-density geometries — distort needs enough vertices to wobble
          smoothly without revealing the polygon scaffolding. */}
      {config.geometry === 'torus'       && <torusGeometry args={[0.72, 0.28, 48, 96]} />}
      {config.geometry === 'sphere'      && <sphereGeometry args={[0.72, 64, 64]} />}
      {config.geometry === 'octahedron'  && <octahedronGeometry args={[0.82, 4]} />}
      {config.geometry === 'icosahedron' && <icosahedronGeometry args={[0.75, 4]} />}
      {config.geometry === 'torusKnot'   && <torusKnotGeometry args={[0.48, 0.17, 192, 32]} />}
      <MeshDistortMaterial
        color={config.color}
        emissive={config.emissive}
        emissiveIntensity={config.emissiveIntensity}
        roughness={config.roughness}
        metalness={config.metalness}
        speed={config.distortSpeed}
        distort={config.distortAmount}
        toneMapped={false}
      />
    </mesh>
  )
}

// ─── Scene (group with mouse parallax) ────────────────────────────────────────

function SceneContent() {
  const groupRef = useRef<THREE.Group>(null!)
  const { mouse } = useThree()

  useFrame(() => {
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, mouse.x * 0.14, 0.055,
    )
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, -mouse.y * 0.09, 0.055,
    )
  })

  return (
    <group ref={groupRef}>
      {SHAPES.map(s => <Shape key={s.id} config={s} />)}

      <ambientLight intensity={0.42} color="#f5e8d2" />
      <directionalLight position={[8, 8, 5]} intensity={1.2} color="#f5dfb8" />
      {/* Warm key — amber */}
      <pointLight position={[-6, 4, 3]}  color="#f0a04a" intensity={14} distance={14} />
      {/* Burnt accent — terracotta */}
      <pointLight position={[6, -3, 2]}  color="#b85c2a" intensity={10} distance={14} />
      {/* Soft fill — bone */}
      <pointLight position={[1, -5, 4]}  color="#ece9df" intensity={7}  distance={12} />
    </group>
  )
}

// ─── Canvas export ────────────────────────────────────────────────────────────

export default function HeroScene() {
  return (
    <div className="hero-scene">
      <Canvas
        camera={{ position: [0, 0, 5.6], fov: 52 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <SceneContent />
        <EffectComposer>
          <Bloom
            mipmapBlur
            luminanceThreshold={0.45}
            intensity={0.7}
            radius={0.55}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
