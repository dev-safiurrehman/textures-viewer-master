import React, {
  useState,
  useEffect,
  Suspense,
  startTransition,
  useTransition,
  CSSProperties,
  useRef,
} from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Html } from "@react-three/drei";
import {
  MeshStandardMaterial,
  TextureLoader,
  MirroredRepeatWrapping,
  RepeatWrapping,
} from "three";
import { useControls, Leva } from "leva";

// ----------------------------------------------------------------
// A small loading fallback with <Html> from drei.
// ----------------------------------------------------------------
function LoadingFallback() {
  return (
    <Html center>
      <div
        style={{
          background: "rgba(255,255,255,0.8)",
          padding: "8px 12px",
          borderRadius: 4,
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    </Html>
  );
}

// ----------------------------------------------------------------
// ObjectUploader Component
// ----------------------------------------------------------------
function ObjectUploader({ setModelUrl }: { setModelUrl: (url: string) => void }) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const url = URL.createObjectURL(file);
      // Wrap in a transition to avoid "synchronous Suspense" warnings
      startTransition(() => {
        setModelUrl(url);
      });
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ fontSize: 13, cursor: "pointer" }}>
        <input
          type="file"
          accept=".gltf,.glb"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <span
          style={{
            background: "#3a3a3a",
            padding: "4px 8px",
            borderRadius: 4,
            color: "#ccc",
          }}
        >
          Upload Custom Model
        </span>
      </label>
    </div>
  );
}

// ----------------------------------------------------------------
// Curtain (Model) Component
// ----------------------------------------------------------------
function Curtain({
  modelUrl,
  texture,
}: {
  modelUrl: string;
  texture: THREE.Texture | null;
}) {
  const { scene } = useGLTF(modelUrl) as any;

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new MeshStandardMaterial({
          color: 0xffffff,
          map: texture || null,
        });
      }
    });
  }, [scene, texture]);

  return <primitive object={scene} />;
}

// ----------------------------------------------------------------
// Main App Component
// ----------------------------------------------------------------
function App() {
  // React 18 concurrency helper
  const [, startTransitionFn] = useTransition();

  // --------------------------------------------------------------
  // Built-in Curtain Models
  // --------------------------------------------------------------
  const modelOptions = [
    { label: "Curtain 1", url: "/assets/models/curtain1.glb" },
    { label: "Curtain 2", url: "/assets/models/curtain2.glb" },
    { label: "Curtain 3", url: "/assets/models/curtain3.glb" },
    { label: "Curtain 4", url: "/assets/models/curtain4.glb" },
  ];
  const [modelUrl, setModelUrl] = useState<string>(modelOptions[0].url);

  function handleModelSelect(url: string) {
    startTransitionFn(() => {
      setModelUrl(url);
    });
  }

  // --------------------------------------------------------------
  // Textures
  // --------------------------------------------------------------
  const textureOptions = [
    { label: "Texture 1", url: "/assets/textures/texture1.jpg" },
    { label: "Texture 2", url: "/assets/textures/texture2.jpg" },
    { label: "Texture 3", url: "/assets/textures/texture3.jpg" },
    { label: "Texture 4", url: "/assets/textures/texture4.jpg" },
  ];
  const [textureUrl, setTextureUrl] = useState<string>(textureOptions[0].url);

  function handleTextureSelect(url: string) {
    startTransitionFn(() => {
      setTextureUrl(url);
    });
  }

  // --------------------------------------------------------------
  // Leva Controls (Right panel)
  // --------------------------------------------------------------
  // Folder: Lighting
  const { lightIntensity } = useControls("Lighting", {
    lightIntensity: { value: 1, min: 0, max: 10, step: 0.1 },
  });

  // Folder: Repeat
  const { repeatX, repeatY, mirrorWrapX, mirrorWrapY } = useControls("Repeat", {
    repeatX: { value: 1, min: 1, max: 10, step: 1 },
    repeatY: { value: 1, min: 1, max: 10, step: 1 },
    mirrorWrapX: { value: false },
    mirrorWrapY: { value: false },
  });

  // Folder: Environment
  const { EnvironmentMap } = useControls("Environment", {
    EnvironmentMap: {
      value: "warehouse",
      options: [
        "none",
        "ocean",
        "sunset",
        "night",
        "trees",
        "warehouse",
        "forest",
        "apartment",
        "studio",
        "park",
        "lobby",
        "city",
      ],
    },
  });

  // --------------------------------------------------------------
  // Load & configure the selected texture
  // --------------------------------------------------------------
  const texture = useLoader(TextureLoader, textureUrl);

  useEffect(() => {
    if (texture) {
      texture.wrapS = mirrorWrapX ? MirroredRepeatWrapping : RepeatWrapping;
      texture.wrapT = mirrorWrapY ? MirroredRepeatWrapping : RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.needsUpdate = true;
    }
  }, [texture, mirrorWrapX, mirrorWrapY, repeatX, repeatY]);

  // --------------------------------------------------------------
  // Left Panel (Leva-like style)
  // --------------------------------------------------------------
  // We'll replicate the dark "Leva look": dark background, light text, subtle rounding, etc.
  const panelStyle: CSSProperties = {
    position: "absolute",
    top: 20,
    left: 20,
    width: 260,
    padding: "1rem",
    background: "#2f2f2f",
    color: "#ccc",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    borderRadius: 8,
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const sectionTitle: CSSProperties = {
    fontWeight: 600,
    marginBottom: 6,
  };

  const radioGroupStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const radioLabelStyle: CSSProperties = {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  const texturePreviewStyle: CSSProperties = {
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const previewImgStyle: CSSProperties = {
    width: "100%",
    height: 120,
    objectFit: "cover",
    borderRadius: 4,
    border: "1px solid #444",
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* LEFT PANEL (models, textures, preview) */}
      <div style={panelStyle}>
        {/* Models Section */}
        <div>
          <div style={sectionTitle}>Select Model</div>
          <div style={radioGroupStyle}>
            {modelOptions.map((option) => (
              <label key={option.url} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="model"
                  checked={modelUrl === option.url}
                  onChange={() => handleModelSelect(option.url)}
                  style={{ cursor: "pointer" }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <ObjectUploader setModelUrl={setModelUrl} />
        </div>

        {/* Textures Section */}
        <div>
          <div style={sectionTitle}>Select Texture</div>
          <div style={radioGroupStyle}>
            {textureOptions.map((option) => (
              <label key={option.url} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="texture"
                  checked={textureUrl === option.url}
                  onChange={() => handleTextureSelect(option.url)}
                  style={{ cursor: "pointer" }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          {/* Texture Preview */}
          <div style={texturePreviewStyle}>
            <div style={{ fontWeight: 500 }}>Preview:</div>
            <img
              src={textureUrl}
              alt="Texture Preview"
              style={previewImgStyle}
            />
          </div>
        </div>
      </div>

      {/* Leva Panel => top-right by default */}
      <Leva collapsed={false} oneLineLabels hideCopyButton />

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }}>
        {/* Environment Map if not "none" */}
        {EnvironmentMap !== "none" && (
          <Environment files={`/assets/environments/${EnvironmentMap}.hdr`} />
        )}

        {/* Orbit Controls => rotate, zoom, pan */}
        <OrbitControls enablePan enableZoom enableRotate />

        {/* Lights */}
        <directionalLight position={[5, 10, 5]} intensity={lightIntensity} />
        <ambientLight intensity={0.3} />

        {/* Suspense for the model */}
        <Suspense fallback={<LoadingFallback />}>
          <Curtain modelUrl={modelUrl} texture={texture} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
