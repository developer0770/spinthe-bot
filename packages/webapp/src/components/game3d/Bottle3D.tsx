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
 * Цвета скинов и свойства стекла.
 */
const BOTTLE_CONFIGS: Record<
  string,
  { glassColor: string; liquidColor?: string; capColor: number }
> = {
  cola: { glassColor: '#366e58', liquidColor: '#1d0b07', capColor: 0xd32f2f },
  classic_green: { glassColor: '#366e58', liquidColor: '#1d0b07', capColor: 0xd32f2f },
  golden: { glassColor: '#f9c74f', liquidColor: '#6b4700', capColor: 0x8b4513 },
  brown_beer: { glassColor: '#5c3a1d', liquidColor: '#2b1606', capColor: 0x222222 },
  whiskey: { glassColor: '#733e14', liquidColor: '#3d1c05', capColor: 0x111111 },
  milk_bottle: { glassColor: '#ffffff', liquidColor: '#eeeeee', capColor: 0x4499dd },
  lime_soda: { glassColor: '#7cb324', liquidColor: '#436b0c', capColor: 0xffffff },
  champagne_bottle: { glassColor: '#1e2b1e', liquidColor: '#0a120a', capColor: 0xf9c74f },
};

/**
 * Создаёт 2D профиль точек контура бутылочки Coca-Cola для LatheGeometry.
 */
function createContourPoints(): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  // Дно
  points.push(new THREE.Vector2(0, -1.6));
  points.push(new THREE.Vector2(0.42, -1.6));
  points.push(new THREE.Vector2(0.52, -1.52));
  points.push(new THREE.Vector2(0.56, -1.4));
  // Нижнее расширение (бедро)
  points.push(new THREE.Vector2(0.58, -0.9));
  points.push(new THREE.Vector2(0.54, -0.5));
  // Талия (узкая часть под этикетку Coca-Cola)
  points.push(new THREE.Vector2(0.44, -0.2));
  points.push(new THREE.Vector2(0.42, 0.0));
  points.push(new THREE.Vector2(0.44, 0.2));
  // Верхнее расширение (плечи)
  points.push(new THREE.Vector2(0.54, 0.5));
  points.push(new THREE.Vector2(0.56, 0.7));
  points.push(new THREE.Vector2(0.48, 0.95));
  // Горлышко
  points.push(new THREE.Vector2(0.24, 1.15));
  points.push(new THREE.Vector2(0.21, 1.45));
  // Кольцо губы под пробкой
  points.push(new THREE.Vector2(0.25, 1.48));
  points.push(new THREE.Vector2(0.21, 1.51));
  // Пробка
  points.push(new THREE.Vector2(0.23, 1.52));
  points.push(new THREE.Vector2(0.23, 1.66));
  points.push(new THREE.Vector2(0, 1.66));
  return points;
}

/**
 * Генерирует Canvas-текстуру для этикетки (красная полоса с белой надписью Coca-Cola).
 */
function createLabelTexture(skinId: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (skinId === 'cola' || skinId === 'classic_green' || !BOTTLE_CONFIGS[skinId]) {
    // Красный фон Coca-Cola
    ctx.fillStyle = '#e41e2b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Белые краевые полосы сверху и снизу
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 12, canvas.width, 7);
    ctx.fillRect(0, canvas.height - 19, canvas.width, 7);

    // Белый курсивный логотип Coca-Cola
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold italic 68px "Brush Script MT", "Segoe Script", "Comic Sans MS", cursive, sans-serif';
    ctx.fillText('Coca-Cola', canvas.width * 0.25, canvas.height / 2);
    ctx.fillText('Coca-Cola', canvas.width * 0.75, canvas.height / 2);
  } else if (skinId === 'golden') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#f9c74f';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.fillStyle = '#f9c74f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('GOLD RESERVE', canvas.width * 0.25, canvas.height / 2);
    ctx.fillText('GOLD RESERVE', canvas.width * 0.75, canvas.height / 2);
  } else if (skinId === 'whiskey') {
    ctx.fillStyle = '#2b1810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e5a93c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold italic 56px serif';
    ctx.fillText('OLD WHISKEY', canvas.width * 0.25, canvas.height / 2);
    ctx.fillText('OLD WHISKEY', canvas.width * 0.75, canvas.height / 2);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('SPIN BOT', canvas.width * 0.25, canvas.height / 2);
    ctx.fillText('SPIN BOT', canvas.width * 0.75, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * 3D-бутылочка на Three.js (реалистичная модель Coca-Cola):
 *  - Лёжа плашмя на деревянном столе (вид сверху под небольшим углом)
 *  - Поворачивается на 360° прямо на поверхности стола
 *  - Тень под бутылочкой, блики стекла и точно воссозданный логотип Coca-Cola
 */
export default function Bottle3D({
  rotation,
  spinning,
  size = 260,
  skinId = 'cola',
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
    labelTexture?: THREE.CanvasTexture;
  }>({ currentAngle: 0, targetAngle: 0, speed: 0 });

  // Инициализация сцены Three.js
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = size;
    const height = size;

    const scene = new THREE.Scene();

    // Камера вида сверху (как на реальном столе)
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
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
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(3, 10, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    scene.add(dir);

    const pointLight = new THREE.PointLight(0xffffff, 0.8, 15);
    pointLight.position.set(-3, 6, 2);
    scene.add(pointLight);

    // Группа вращения (ось Y по центру стола)
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    // Группа бутылочки (повернута плашмя на стол)
    const bottleGroup = new THREE.Group();
    // Приподнимаем бутылку над полом
    bottleGroup.position.y = 0.36;
    // Поворачиваем бутылку горизонтально вдоль оси Z (чтобы лежала на столе)
    bottleGroup.rotation.x = Math.PI / 2;
    pivotGroup.add(bottleGroup);

    const config = BOTTLE_CONFIGS[skinId] || BOTTLE_CONFIGS.cola;

    // Материал стеклянного корпуса
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(config.glassColor),
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.45,
      ior: 1.5,
      thickness: 0.7,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.92,
    });

    // Модель тела бутылочки через LatheGeometry (контур Coca-Cola)
    const points = createContourPoints();
    const latheGeo = new THREE.LatheGeometry(points, 48);
    const bottleMesh = new THREE.Mesh(latheGeo, glassMat);
    bottleMesh.castShadow = true;
    bottleGroup.add(bottleMesh);

    // Внутренняя жидкость (тёмный напиток)
    const liquidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.liquidColor || '#1d0b07'),
      roughness: 0.3,
      metalness: 0.0,
    });
    const liquidPoints = points.map((p) => new THREE.Vector2(p.x * 0.9, p.y * 0.92));
    const liquidGeo = new THREE.LatheGeometry(liquidPoints, 32);
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.position.y = -0.05;
    bottleGroup.add(liquidMesh);

    // Красная этикетка Coca-Cola вокруг талии
    const labelTexture = createLabelTexture(skinId);
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.4,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const labelGeo = new THREE.CylinderGeometry(0.445, 0.445, 0.65, 36, 1, true);
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = 0.0;
    labelMesh.rotation.y = Math.PI / 2; // Центрируем логотип спереди
    bottleGroup.add(labelMesh);

    // Красная крышка на горлышке
    const capMat = new THREE.MeshStandardMaterial({
      color: config.capColor,
      roughness: 0.35,
      metalness: 0.6,
    });
    const capGeo = new THREE.CylinderGeometry(0.235, 0.235, 0.16, 24);
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.y = 1.59;
    capMesh.castShadow = true;
    bottleGroup.add(capMesh);

    // Реалистичная овальная тень под бутылкой на столе
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(1.6, 3.8);
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
      labelTexture,
    };

    // Цикл анимации вращения
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

      // Вращение бутылки плашмя на 360 градусов по оси Y
      st.pivotGroup.rotation.y = (st.currentAngle * Math.PI) / 180;

      // Лёгкое покачивание при вращении для физической реалистичности
      const wobble = spinning ? Math.sin(Date.now() / 60) * 0.04 : 0;
      st.pivotGroup.rotation.z = wobble;

      renderer.render(st.scene, st.camera);
      st.raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf);
      labelTexture.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // Обновление цвета и текстуры при смене скина
  useEffect(() => {
    const st = stateRef.current;
    if (!st.glassMat || !st.capMat || !st.labelMat) return;

    const config = BOTTLE_CONFIGS[skinId] || BOTTLE_CONFIGS.cola;
    st.glassMat.color.set(config.glassColor);
    st.capMat.color.setHex(config.capColor);

    if (st.labelTexture) {
      st.labelTexture.dispose();
    }
    const newTex = createLabelTexture(skinId);
    st.labelMat.map = newTex;
    st.labelMat.needsUpdate = true;
    st.labelTexture = newTex;
  }, [skinId]);

  // Обновление целевого угла поворота
  useEffect(() => {
    stateRef.current.targetAngle = rotation + 180;
  }, [rotation]);

  // Начальное импульсное вращение
  useEffect(() => {
    if (spinning) {
      stateRef.current.speed = Math.max(stateRef.current.speed, 14);
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

