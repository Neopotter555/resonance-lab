"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface FrequencyFieldProps {
  intensity: number;
  modeLabel: string;
}

export function FrequencyField({ intensity, modeLabel }: FrequencyFieldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x07111f, 4, 14);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
    camera.position.set(0, 0.2, 6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const particleCount = 900;
    const positions = new Float32Array(particleCount * 3);
    const baseAngles = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);

    for (let index = 0; index < particleCount; index += 1) {
      const angle = index * 0.27;
      const radius = 0.4 + (index % 120) / 30;
      baseAngles[index] = angle;
      radii[index] = radius;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle) * radius * 0.66;
      positions[index * 3 + 2] = ((index % 70) - 35) / 18;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x75f0bf,
      size: 0.026,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const ringGroup = new THREE.Group();
    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0xf4c774,
      transparent: true,
      opacity: 0.48,
    });

    for (let radius = 1; radius <= 4; radius += 1) {
      const curve = new THREE.EllipseCurve(0, 0, radius * 0.42, radius * 0.42, 0, Math.PI * 2);
      const points = curve.getPoints(96);
      const ringGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
      ring.rotation.x = radius % 2 === 0 ? 0.9 : -0.9;
      ring.rotation.y = radius * 0.34;
      ringGroup.add(ring);
    }

    scene.add(ringGroup);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const elapsed = performance.now() / 1000;
      const liveIntensity = intensityRef.current;
      const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;

      for (let index = 0; index < particleCount; index += 1) {
        const angle = baseAngles[index] + elapsed * (0.07 + liveIntensity * 0.04);
        const radius = radii[index] + Math.sin(elapsed * 1.7 + index * 0.03) * liveIntensity * 0.32;
        positionAttribute.setXYZ(
          index,
          Math.cos(angle) * radius,
          Math.sin(angle * 1.4) * radius * 0.52,
          Math.sin(angle * 0.7 + elapsed) * 1.2,
        );
      }

      positionAttribute.needsUpdate = true;
      particles.rotation.z = elapsed * 0.05;
      particles.rotation.y = Math.sin(elapsed * 0.2) * 0.18;
      ringGroup.rotation.y = elapsed * 0.12;
      ringGroup.rotation.x = Math.sin(elapsed * 0.15) * 0.28;
      material.opacity = 0.55 + liveIntensity * 0.35;
      renderer.render(scene, camera);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      mount.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      ringMaterial.dispose();
      ringGroup.children.forEach((child) => {
        if (child instanceof THREE.LineLoop) {
          child.geometry.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded border border-white/10 bg-[#07111f]">
      <div ref={mountRef} className="absolute inset-0" aria-label="Three.js frequency field" />
      <div className="absolute left-4 top-4 rounded border border-white/10 bg-black/35 px-3 py-2 text-xs uppercase text-slate-200 backdrop-blur">
        {modeLabel} visual engine
      </div>
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 text-xs text-slate-200">
        {["Audio reactive", "Sacred geometry", "Breath field"].map((label) => (
          <div key={label} className="rounded border border-white/10 bg-white/8 px-3 py-2">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
