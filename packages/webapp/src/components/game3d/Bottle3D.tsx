import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  /** Конечный угол в градусах (куда указывает горлышко). */
  rotation: number;
  /** Анимируется ли сейчас вращение. */
  spinning: boolean;
  /** Размер канваса в px (ширина и высота, квадрат). */
  size?: number;
  /** ID активного скина бутылочки (из User.activeBottleId). */
  skinId?: string;
  /** Нажатие на бутылочку. */
  onClick?: () => void;
}

/**
 * Цвета скинов бутылочек.
 */
const BOTTLE_COLORS: Record<string, { color: string; cap: number; label?: string }> = {
  classic_green: { color: '#2e7d32', cap: 0xd32f2f },
  green: { color: '#2e7d32', cap: 0xd32f2f },
  golden: { color: '#f9c74f', cap: 0x8b4513 },
  goldb: { color: '#f9c74f', cap: 0x8b4513 },
  blue: { color: '#2b5ea8', cap: 0x1a365d },
  prime: { color: '#e63946', cap: 0x1d3557 },
  cola: { color: '#3e1616', cap: 0xcc0000 },
  cocacola: { color: '#3e1616', cap: 0xcc0000 },
  brown_beer: { color: '#8b5a2b', cap: 0x222222 },
  whiskey: { color: '#6d3c11', cap: 0x111111 },
  milk_bottle: { color: 'rgba(255,255,255,0.5)', cap: 0x4499dd },
  lime_soda: { color: '#94c92e', cap: 0xffffff },
  champagne_bottle: { color: '#1a1a1a', cap: 0xf9c74f },
};

/**
 * 3D-бутылочка на Three.js:
 *  - корпус-цилиндр с коническим горлышком
 *  - вращение с эмуляцией трения (easing-out) к целевому углу
 *  - мягкий свет, прозрачное стекло, блик
 *  - цвет зависит от выбранного скина
 */
export default function Bottle3D({
  rotation,
  spinning,
  size = 260,
  skinId = 'classic_green',
  onClick,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    bottle?: THREE.Group;
    currentAngle: number;
    targetAngle: number;
    speed: number;
    raf?: number;
    label?: THREE.Mesh;
    cap?: THREE.Mesh;
    body?: THREE.Mesh;
    shoulder?: THREE.Mesh;
    bottom?: THREE.Mesh;
    neck?: THREE.Mesh;
    glassMat?: THREE.MeshPhysicalMaterial;
    capMat?: THREE.MeshStandardMaterial;
    labelMat?: THREE.MeshStandardMaterial;
  }>({ currentAngle: 0, targetAngle: 0, speed: 0 });

  // Инициализация сцены
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = size;
    const height = size;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 5.5, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Свет
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    scene.add(dir);
    const rim = new THREE.PointLight(0x94c92e, 1.0, 20);
    rim.position.set(-3, 2, -3);
    scene.add(rim);

    // Тень на «полу»
    const shadowGeo = new THREE.CircleGeometry(1.6, 32);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.02;
    scene.add(shadow);

    // Группа бутылочки (вращается вокруг Y)
    const bottle = new THREE.Group();
    scene.add(bottle);

    const skin = BOTTLE_COLORS[skinId] || BOTTLE_COLORS.classic_green;
    const isLight = skinId === 'milk_bottle';
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(skin.color),
      metalness: isLight ? 0 : 0.1,
      roughness: isLight ? 0.3 : 0.2,
      transmission: isLight ? 0.7 : 0.3,
      ior: 1.45,
      thickness: 0.6,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      emissive: new THREE.Color(0x000000),
      transparent: isLight,
      opacity: isLight ? 0.85 : 1,
    });

    // Дно (широкий цилиндр)
    const bottomGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.3, 32);
    const bottom = new THREE.Mesh(bottomGeo, glassMat);
    bottom.position.y = -0.85;
    bottom.castShadow = true;
    bottle.add(bottom);

    // Основное тело
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.55, 1.4, 32);
    const body = new THREE.Mesh(bodyGeo, glassMat);
    body.position.y = 0;
    body.castShadow = true;
    bottle.add(body);

    // Плечики (сужение к горлышку)
    const shoulderGeo = new THREE.CylinderGeometry(0.22, 0.5, 0.35, 32);
    const shoulder = new THREE.Mesh(shoulderGeo, glassMat);
    shoulder.position.y = 0.85;
    shoulder.castShadow = true;
    bottle.add(shoulder);

    // Горлышко
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 24);
    const neck = new THREE.Mesh(neckGeo, glassMat);
    neck.position.y = 1.28;
    neck.castShadow = true;
    bottle.add(neck);

    // Пробка
    const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 24);
    const capMat = new THREE.MeshStandardMaterial({ color: skin.cap, metalness: 0.4, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.62;
    cap.castShadow = true;
    bottle.add(cap);

    // Блик-этикетка (белый овал на боку)
    const labelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.7, 32, 1, true, -0.4, 0.8);
    const labelMat = new THREE.MeshStandardMaterial({
      color: skin.label || 0xffffff,
      roughness: 0.6,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = 0;
    bottle.add(label);

    // Наклон бутылочки чуть вперёд для объёма
    bottle.rotation.x = -0.2;

    stateRef.current = {
      renderer,
      scene,
      camera,
      bottle,
      currentAngle: 0,
      targetAngle: 0,
      speed: 0,
      body,
      cap,
      label,
      bottom,
      shoulder,
      neck,
      glassMat,
      capMat,
      labelMat,
    };

    // Анимационный цикл
    const animate = () => {
      const st = stateRef.current;
      if (!st.renderer || !st.scene || !st.camera || !st.bottle) return;

      const diff = st.targetAngle - st.currentAngle;
      st.speed = diff * 0.08 + st.speed * 0.86;
      st.currentAngle += st.speed;
      if (Math.abs(diff) < 0.3 && Math.abs(st.speed) < 0.1) {
        st.speed = 0;
        st.currentAngle = st.targetAngle;
      }
      st.bottle.rotation.y = (st.currentAngle * Math.PI) / 180;

      const wobble = spinning ? Math.sin(Date.now() / 80) * 0.05 : 0;
      st.bottle.rotation.z = wobble;

      renderer.render(st.scene, st.camera);
      st.raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // Обновление цвета бутылочки при смене скина (без перемонтирования сцены)
  useEffect(() => {
    const st = stateRef.current;
    if (!st.glassMat || !st.capMat || !st.labelMat) return;
    const skin = BOTTLE_COLORS[skinId] || BOTTLE_COLORS.classic_green;
    const isLight = skinId === 'milk_bottle';
    st.glassMat.color.set(skin.color);
    st.glassMat.transmission = isLight ? 0.7 : 0.3;
    st.glassMat.opacity = isLight ? 0.85 : 1;
    st.glassMat.transparent = isLight;
    st.glassMat.metalness = isLight ? 0 : 0.1;
    st.glassMat.roughness = isLight ? 0.3 : 0.2;
    st.glassMat.thickness = 0.6;
    st.glassMat.needsUpdate = true;
    st.capMat.color.setHex(skin.cap);
    st.capMat.needsUpdate = true;
    st.labelMat.color.setHex(typeof skin.label === 'number' ? skin.label : 0xffffff);
    st.labelMat.needsUpdate = true;
  }, [skinId]);

  // Обновление целевого угла
  useEffect(() => {
    stateRef.current.targetAngle = rotation + 180;
  }, [rotation]);

  // При spinning поддаём скорости
  useEffect(() => {
    if (spinning) {
      stateRef.current.speed = Math.max(stateRef.current.speed, 12);
    }
  }, [spinning]);

  return (
    <div
      ref={mountRef}
      onClick={onClick}
      style={{ width: size, height: size, cursor: onClick ? 'pointer' : 'default' }}
      className="select-none touch-none"
    />
  );
}
