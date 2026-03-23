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
}

const SHAPES: ShapeConfig[] = [
  {
    id: 0,
    geometry: 'torus',
    position: [3.0, 0.4, 0],
    color: '#060c30',
    emissive: '#1d4ed8',
    emissiveIntensity: 0.7,
    roughness: 0.08,
    metalness: 0.9,
    scale: 1.15,
    floatSpeed: 0.55,
    floatAmp: 0.22,
    floatPhase: 0,
    rotAxis: [0.3, 1, 0.2],
    rotSpeed: 0.004,
  },
  {
    id: 1,
    geometry: 'sphere',
    position: [-2.6, 0.9, -0.5],
    color: '#140630',
    emissive: '#7c3aed',
    emissiveIntensity: 0.6,
    roughness: 0.05,
    metalness: 0.88,
    scale: 0.92,
    floatSpeed: 0.42,
    floatAmp: 0.26,
    floatPhase: 1.5,
    rotAxis: [0.2, 0.7, 0.5],
    rotSpeed: 0.003,
  },
  {
    id: 2,
    geometry: 'octahedron',
    position: [1.0, -1.6, 0.3],
    color: '#021214',
    emissive: '#0891b2',
    emissiveIntensity: 0.75,
    roughness: 0.05,
    metalness: 0.82,
    scale: 0.75,
    floatSpeed: 0.78,
    floatAmp: 0.17,
    floatPhase: 2.2,
    rotAxis: [1, 0.4, 0.3],
    rotSpeed: 0.007,
  },
  {
    id: 3,
    geometry: 'icosahedron',
    position: [-0.6, -1.1, -0.3],
    color: '#06032a',
    emissive: '#4338ca',
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.78,
    scale: 0.68,
    floatSpeed: 0.52,
    floatAmp: 0.21,
    floatPhase: 3.8,
    rotAxis: [0.5, 0.8, 0.4],
    rotSpeed: 0.005,
  },
  {
    id: 4,
    geometry: 'torusKnot',
    position: [5.0, -0.4, 0],
    color: '#180210',
    emissive: '#db2777',
    emissiveIntensity: 0.7,
    roughness: 0.1,
    metalness: 0.82,
    scale: 0.72,
    floatSpeed: 0.68,
    floatAmp: 0.19,
    floatPhase: 0.8,
    rotAxis: [0.6, 1, 0.3],
    rotSpeed: 0.008,
  },
  {
    id: 5,
    geometry: 'sphere',
    position: [4.6, 1.8, -1],
    color: '#021022',
    emissive: '#0284c7',
    emissiveIntensity: 0.5,
    roughness: 0.06,
    metalness: 0.9,
    scale: 0.52,
    floatSpeed: 0.6,
    floatAmp: 0.16,
    floatPhase: 4.5,
    rotAxis: [0.3, 0.6, 0.8],
    rotSpeed: 0.004,
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
      {config.geometry === 'torus'       && <torusGeometry args={[0.72, 0.28, 24, 64]} />}
      {config.geometry === 'sphere'      && <sphereGeometry args={[0.72, 32, 32]} />}
      {config.geometry === 'octahedron'  && <octahedronGeometry args={[0.82]} />}
      {config.geometry === 'icosahedron' && <icosahedronGeometry args={[0.75, 1]} />}
      {config.geometry === 'torusKnot'   && <torusKnotGeometry args={[0.48, 0.17, 128, 16]} />}
      <meshStandardMaterial
        color={config.color}
        emissive={config.emissive}
        emissiveIntensity={config.emissiveIntensity}
        roughness={config.roughness}
        metalness={config.metalness}
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

      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 8, 5]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-6, 4, 3]}  color="#4455ff" intensity={14} distance={14} />
      <pointLight position={[6, -3, 2]}  color="#aa00ff" intensity={12} distance={14} />
      <pointLight position={[1, -5, 4]}  color="#00b8d9" intensity={10} distance={12} />
    </group>
  )
}

// ─── Canvas export ────────────────────────────────────────────────────────────

export default function HeroScene() {
  return (
    <div className="hero-scene">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <SceneContent />
        <EffectComposer>
          <Bloom
            mipmapBlur
            luminanceThreshold={0.12}
            intensity={1.5}
            radius={0.72}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
