'use client'

import { Float, Image, MeshDistortMaterial, Sparkles, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import * as THREE from 'three'
import type { SeriesCardItem } from '@/lib/seriesItems'
import type { WebglHomeSeriesMode } from '@/lib/homeSeriesMode'
import { RIPPLE_FRAG, RIPPLE_VERT } from './shaders'

export type WebglMode = WebglHomeSeriesMode

export type WebglPointerState = {
  inside: boolean
  hasPosition: boolean
  uvX: number
  uvY: number
}

type Props = {
  items: SeriesCardItem[]
  mode: WebglMode
  onHoverTitle: (title: string | null) => void
  pointerState: MutableRefObject<WebglPointerState>
}

export default function WebglStage({
  items,
  mode,
  onHoverTitle,
  pointerState,
}: Props) {
  const trio = useMemo(() => padTrio(items), [items])

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 5.4], fov: 34 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => onHoverTitle(null)}
    >
      <color attach="background" args={['#0b0b10']} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 2, 6]} intensity={1.35} />
      <Suspense fallback={null}>
        {mode === 'liquid' && (
          <LiquidScene
            items={trio}
            onHoverTitle={onHoverTitle}
            pointerState={pointerState}
          />
        )}
        {mode === 'shards' && <ShardScene items={trio} onHoverTitle={onHoverTitle} />}
        {mode === 'warp' && <WarpScene items={trio} onHoverTitle={onHoverTitle} />}
      </Suspense>
    </Canvas>
  )
}

function LiquidScene({
  items,
  onHoverTitle,
  pointerState,
}: {
  items: SeriesCardItem[]
  onHoverTitle: (title: string | null) => void
  pointerState: MutableRefObject<WebglPointerState>
}) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const { viewport, size, gl } = useThree()
  const textures = useLoader(
    THREE.TextureLoader,
    items.map((item) => item.image),
  )
  const mouse = useRef(new THREE.Vector2(0.5, 0.5))
  const target = useRef(new THREE.Vector2(0.5, 0.5))
  const hovering = useRef(false)
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        t0: { value: null },
        t1: { value: null },
        t2: { value: null },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uAmp: { value: 0 },
      },
      vertexShader: RIPPLE_VERT,
      fragmentShader: RIPPLE_FRAG,
    })
    return mat
  }, [])

  useEffect(() => {
    textures.forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.minFilter = THREE.LinearFilter
      tex.needsUpdate = true
    })
    material.uniforms.t0.value = textures[0]
    material.uniforms.t1.value = textures[1]
    material.uniforms.t2.value = textures[2]
  }, [material, textures])

  useEffect(() => {
    const el = gl.domElement
    const syncPointer = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      pointerState.current.inside = true
      pointerState.current.hasPosition = true
      pointerState.current.uvX = THREE.MathUtils.clamp(
        (event.clientX - rect.left) / Math.max(rect.width, 1),
        0,
        1,
      )
      pointerState.current.uvY = THREE.MathUtils.clamp(
        1 - (event.clientY - rect.top) / Math.max(rect.height, 1),
        0,
        1,
      )
    }
    const leave = () => {
      pointerState.current.inside = false
      onHoverTitle(null)
    }

    // `pointerenter` is not replayed when the canvas finishes loading beneath
    // an already-stationary cursor. CSS hover state is available immediately.
    if (el.matches(':hover') && !pointerState.current.inside) {
      pointerState.current.inside = true
      pointerState.current.hasPosition = false
    }

    el.addEventListener('pointerenter', syncPointer)
    el.addEventListener('pointermove', syncPointer)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointerenter', syncPointer)
      el.removeEventListener('pointermove', syncPointer)
      el.removeEventListener('pointerleave', leave)
    }
  }, [gl, onHoverTitle, pointerState])

  useFrame(({ clock, pointer }, delta) => {
    const nextHovering = pointerState.current.inside
    const justEntered = nextHovering && !hovering.current

    if (nextHovering) {
      if (pointerState.current.hasPosition) {
        target.current.set(
          pointerState.current.uvX,
          pointerState.current.uvY,
        )
      } else {
        target.current.set(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5)
      }
      if (justEntered) {
        mouse.current.copy(target.current)
      } else {
        mouse.current.lerp(target.current, 0.18)
      }
    }

    hovering.current = nextHovering
    const amp = material.uniforms.uAmp
    if (reduce) {
      amp.value = 0
    } else if (nextHovering) {
      if (justEntered) amp.value = Math.max(amp.value, 0.72)
      amp.value = Math.min(1, amp.value + delta / 0.08)
    } else {
      amp.value = Math.max(0, amp.value - delta / 2.4)
    }
    material.uniforms.uMouse.value.copy(mouse.current)
    material.uniforms.uRes.value.set(size.width, size.height)
    material.uniforms.uTime.value = reduce ? 0 : clock.elapsedTime
  })

  const pickIndex = (uvx: number) => Math.min(2, Math.max(0, Math.floor(uvx * 3)))

  return (
    <mesh
      scale={[viewport.width, viewport.height, 1]}
      onPointerMove={(event) => {
        const i = pickIndex(event.uv?.x ?? 0.5)
        onHoverTitle(items[i]?.title ?? null)
      }}
      onPointerOut={() => onHoverTitle(null)}
      onClick={(event) => {
        const i = pickIndex(event.uv?.x ?? 0.5)
        const href = items[i]?.href
        if (href) router.push(href)
      }}
    >
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function ShardScene({
  items,
  onHoverTitle,
}: {
  items: SeriesCardItem[]
  onHoverTitle: (title: string | null) => void
}) {
  const { viewport } = useThree()
  const reduce = useReducedMotion()
  const n = items.length
  const gap = viewport.width * 0.028
  const cardW = (viewport.width - gap * (n - 1)) * 0.86 / n
  const cardH = viewport.height * 0.78
  const start = -((n - 1) * (cardW + gap)) / 2

  return (
    <>
      <Sparkles
        count={36}
        scale={[viewport.width * 0.92, viewport.height * 0.7, 1.4]}
        size={2.4}
        speed={reduce ? 0 : 0.35}
        opacity={0.55}
        color="#d8deea"
      />
      {items.map((item, i) => (
        <Float
          key={item.href}
          enabled={!reduce}
          speed={1.1 + i * 0.15}
          rotationIntensity={0.18}
          floatIntensity={0.28}
          floatingRange={[-0.06, 0.08]}
        >
          <ShardCard
            item={item}
            scale={[cardW, cardH]}
            position={[start + i * (cardW + gap), 0, i === 1 ? 0.12 : 0]}
            onHoverTitle={onHoverTitle}
          />
        </Float>
      ))}
    </>
  )
}

function ShardCard({
  item,
  scale,
  position,
  onHoverTitle,
}: {
  item: SeriesCardItem
  scale: [number, number]
  position: [number, number, number]
  onHoverTitle: (title: string | null) => void
}) {
  const router = useRouter()
  const ref = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame(({ pointer }) => {
    const mesh = ref.current
    if (!mesh) return
    const tx = hovered ? 0.22 : 0
    mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, pointer.x * 0.22 + (hovered ? 0.06 : 0), 0.08)
    mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, -pointer.y * 0.16, 0.08)
    mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, position[2] + tx, 0.1)
  })

  return (
    <Image
      ref={ref}
      url={item.image}
      scale={scale}
      position={position}
      radius={0.045}
      zoom={hovered ? 1.08 : 1}
      grayscale={hovered ? 0 : 0.18}
      toneMapped={false}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        onHoverTitle(item.title)
      }}
      onPointerOut={() => {
        setHovered(false)
        onHoverTitle(null)
      }}
      onClick={(event) => {
        event.stopPropagation()
        router.push(item.href)
      }}
    />
  )
}

function WarpScene({
  items,
  onHoverTitle,
}: {
  items: SeriesCardItem[]
  onHoverTitle: (title: string | null) => void
}) {
  const textures = useLoader(
    THREE.TextureLoader,
    items.map((item) => item.image),
  )
  const { viewport } = useThree()
  const reduce = useReducedMotion()
  const n = items.length
  const gap = viewport.width * 0.016
  const w = (viewport.width - gap * (n - 1)) / n
  const h = viewport.height
  const start = -((n - 1) * (w + gap)) / 2

  useEffect(() => {
    textures.forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
    })
  }, [textures])

  return (
    <>
      {items.map((item, i) => (
        <WarpPanel
          key={item.href}
          item={item}
          texture={textures[i]}
          width={w}
          height={h}
          x={start + i * (w + gap)}
          reduce={!!reduce}
          onHoverTitle={onHoverTitle}
        />
      ))}
    </>
  )
}

function WarpPanel({
  item,
  texture,
  width,
  height,
  x,
  reduce,
  onHoverTitle,
}: {
  item: SeriesCardItem
  texture: THREE.Texture
  width: number
  height: number
  x: number
  reduce: boolean
  onHoverTitle: (title: string | null) => void
}) {
  const router = useRouter()
  const ref = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame(({ pointer }) => {
    const mesh = ref.current
    if (!mesh) return
    mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, hovered ? 0.28 : 0, 0.1)
    mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, pointer.x * 0.12, 0.06)
  })

  return (
    <mesh
      ref={ref}
      position={[x, 0, 0]}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        onHoverTitle(item.title)
      }}
      onPointerOut={() => {
        setHovered(false)
        onHoverTitle(null)
      }}
      onClick={(event) => {
        event.stopPropagation()
        router.push(item.href)
      }}
    >
      <planeGeometry args={[width, height, 48, 48]} />
      <MeshDistortMaterial
        map={texture}
        distort={reduce ? 0.08 : hovered ? 0.42 : 0.22}
        speed={reduce ? 0.4 : hovered ? 2.4 : 1.35}
        radius={1}
        roughness={0.28}
        metalness={0.08}
        toneMapped={false}
      />
    </mesh>
  )
}

function padTrio(items: SeriesCardItem[]): SeriesCardItem[] {
  const fallback: SeriesCardItem[] = [
    { href: '/category/cloud', title: '클라우드', image: '/images/choice-overload.jpg', count: 0 },
    { href: '/category/opensource', title: '오픈소스', image: '/images/law-of-proximity.jpg', count: 0 },
    { href: '/category/ai', title: 'AI', image: '/images/millers-law.jpg', count: 0 },
  ]
  const source = items.length ? items : fallback
  return [0, 1, 2].map((i) => source[i % source.length])
}
