// App.tsx
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import {
  Brush,
  Evaluator,
  SUBTRACTION,
} from "three-bvh-csg";
import './App.css';

function CSGScene() {
  const brushRef = useRef<Brush>(null);
  const baseBrushes = useRef<Brush[]>([]);
  const resultMeshes = useRef<THREE.Mesh[]>([]);
  const evaluatorRef = useRef(new Evaluator());

  const { scene } = useThree();

  const [params] = useState({
    operation: SUBTRACTION,
    useGroups: true,
    wireframe: false,
  });

  // 初期化：6枚の板を生成（Z軸に並べる）
  useEffect(() => {
    const brushes: Brush[] = [];
    const numObjects = 20; // オブジェクトの数
    const spacing = 0.2; // オブジェクト間の間隔

    // 全体の幅を計算してから、各板を配置
    const totalLength = (numObjects - 1) * spacing; // オブジェクトの合計長さ
    const startZ = -totalLength / 2; // 中央を基準に配置するための開始位置

    // ジオメトリ生成と配置
    for (let i = 0; i < numObjects; i++) {
      const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random());
      const box = new Brush(
        new THREE.BoxGeometry(3, 3, 0.01),
        new THREE.MeshStandardMaterial({
          color: randomColor,
          flatShading: true,
          transparent: true,
          opacity: 0.7,
        })
      );
      box.position.set(0, 0, startZ + i * spacing); // 開始位置からずらして配置
      box.updateMatrixWorld();
      brushes.push(box);
    }

    baseBrushes.current = brushes;
  }, []);


  // 毎フレーム、CSG を評価
  useFrame(() => {
    const t = performance.now() * 0.001;

    const brush = brushRef.current;
    if (!brush) return;

    // 球体をX軸にスイング
    brush.position.z = Math.sin(t) * 2.6;
    brush.updateMatrixWorld();

    // 古い結果を削除
    resultMeshes.current.forEach((m) => {
      scene.remove(m);
      m.geometry.dispose();
      if (Array.isArray(m.material)) {
        m.material.forEach((mat) => mat.dispose());
      } else {
        m.material.dispose();
      }
    });
    resultMeshes.current = [];

    // 新しい CSG 評価
    const evaluator = evaluatorRef.current;
    evaluator.useGroups = params.useGroups;

    const newResults = baseBrushes.current.map((base) => {
      const result = evaluator.evaluate(base, brush, params.operation);
      result.castShadow = true;
      result.receiveShadow = true;
      scene.add(result);
      return result;
    });

    resultMeshes.current = newResults;
  });

  // 初期の球体（表示しない）
  const brush = useRef(
    new Brush(
      new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x80cbc4, visible: false }) // 描画しない
    )
  );

  return (
    <>
      <ambientLight intensity={3} />
      <directionalLight position={[3, 12, 9]} intensity={0.3} castShadow />

      {/* 地面 */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial transparent opacity={0.075} color={0xd81b60} />
      </mesh>

      {/* 球体（可視化しない） */}
      <primitive object={brush.current} ref={brushRef} visible={false} />
    </>
  );
}

function App() {
  return (
    <div className="canvas-wrapper">
      <Canvas shadows camera={{ position: [10, 0, 0], fov: 50, near: 0.1, far: 1000  }}>
        <CSGScene />
        <OrbitControls minDistance={5} maxDistance={75} />
      </Canvas>
    </div>
  );
}

export default App;
