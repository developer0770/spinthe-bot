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
  golden: { color: '#f9c74f', cap: 0x8b4513 },
  brown_beer: { color: '#8b5a2b', cap: 0x222222 },
  whiskey: { color: '#6d3c11', cap: 0x111111 },
  cola: { color: '#3e1616', cap: 0xcc0000 },
  milk_bottle: { color: 'rgba(255,255,255,0.5)', cap: 0x4499dd },
  lime_soda: { color: '#94c92e', cap: 0xffffff },
  champagne_bottle: { color: '#1a1a1a', cap: 0xf9c74f },
};

/**
 * 3D-бутылочка на Three.js:
 *  - Оригинал дизайна бутылочки (зелёный корпус с красной пробкой)
 *  - Лежит плашмя на деревянном столе (вид сверху под углом)
 *  - Вращается на 360° прямо по поверхности стола, указывая горлышком на игроков
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
    pivotGroup?: THREE.Group;
    currentAngle: number;
    targetAngle: number;
    speed: number;
    raf?: number;
    glassMat?: THREE.MeshPhysicalMaterial;
    capMat?: THREE.MeshStandardMaterial;
    labelMat?: THREE.MeshStandardMaterial;
  }>({ currentAngle: 0, targetAngle: 0, speed: 0 });

  // Инициализация сцены Three.js
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = size;
    const height = size;

    const scene = new THREE.Scene();

    // Камера сверху под углом для обзора лежащей на столе бутылки
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 7.2, 2.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Освещение
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(4, 10, 5);
    dir.castShadow = true;
    scene.add(dir);

    const rim = new THREE.PointLight(0x94c92e, 0.8, 20);
    rim.position.set(-3, 4, -2);
    scene.add(rim);

    // Группа вращения (вращается вокруг центра Y стола)
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    // Овальная тень под бутылкой на полу стола
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(1.6, 3.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    pivotGroup.add(shadowMesh);

    // Группа модели бутылочки (кладем горизонтально вдоль оси Z)
    const bottleGroup = new THREE.Group();
    bottleGroup.position.y = 0.35; // Высота над полом стола
    bottleGroup.rotation.x = Math.PI / 2; // Кладем плашмя на стол
    pivotGroup.add(bottleGroup);

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
      transparent: isLight,
      opacity: isLight ? 0.85 : 1,
    });

    // Оригинальные элементы дизайна бутылки:
    // Дно
    const bottomGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.3, 32);
    const bottom = new THREE.Mesh(bottomGeo, glassMat);
    bottom.position.y = -0.85;
    bottom.castShadow = true;
    bottleGroup.add(bottom);

    // Основное тело
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.55, 1.4, 32);
    const body = new THREE.Mesh(bodyGeo, glassMat);
    body.position.y = 0;
    body.castShadow = true;
    bottleGroup.add(body);

    // Плечики
    const shoulderGeo = new THREE.CylinderGeometry(0.22, 0.5, 0.35, 32);
    const shoulder = new THREE.Mesh(shoulderGeo, glassMat);
    shoulder.position.y = 0.85;
    shoulder.castShadow = true;
    bottleGroup.add(shoulder);

    // Горлышко
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 24);
    const neck = new THREE.Mesh(neckGeo, glassMat);
    neck.position.y = 1.28;
    neck.castShadow = true;
    bottleGroup.add(neck);

    // Пробка (красная/выбранного цвета)
    const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 24);
    const capMat = new THREE.MeshStandardMaterial({ color: skin.cap, metalness: 0.4, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.62;
    cap.castShadow = true;
    bottleGroup.add(cap);

    // Блик-этикетка
    const labelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.7, 32, 1, true, -0.4, 0.8);
    const labelMat = new THREE.MeshStandardMaterial({
      color: skin.label || 0xffffff,
      roughness: 0.6,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = 0;
    bottleGroup.add(label);

    stateRef.current = {
      renderer,
      scene,
      camera,
      pivotGroup,
      currentAngle: 0,
      targetAngle: 0,
      speed: 0,
      glassMat,
      capMat,
      labelMat,
    };

    // Анимационный цикл вращения плашмя на столе
    const animate = () => {
      const st = stateRef.current;
      if (!st.renderer || !st.scene || !st.camera || !st.pivotGroup) return;

      const diff = st.targetAngle - st.currentAngle;
      st.speed = diff * 0.08 + st.speed * 0.86;
      st.currentAngle += st.speed;

      if (Math.abs(diff) < 0.3 && Math.abs(st.speed) < 0.1) {
        st.speed = 0;
        st.currentAngle = st.targetAngle;
      }

      // Поворот всей лежащей бутылки вокруг вертикальной оси Y стола
      st.pivotGroup.rotation.y = (st.currentAngle * Math.PI) / 180;

      // Лёгкое покачивание при вращении
      const wobble = spinning ? Math.sin(Date.now() / 80) * 0.05 : 0;
      st.pivotGroup.rotation.z = wobble;

      renderer.render(st.scene, st.camera);
      st.raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf);
      shadowTex.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // Обновление цвета бутылочки при смене скина
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
      className="select-none touch-none flex items-center justify-center"
    />
  );
}

