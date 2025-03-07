
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
import { OrbitControls, Environment, useGLTF, Html, TransformControls } from "@react-three/drei";
import {
  MeshStandardMaterial,
  TextureLoader,
  MirroredRepeatWrapping,
  RepeatWrapping,
  sRGBEncoding,
} from "three";
import { useControls, Leva } from "leva";

// ----------------------------------------------------------------
// Loading Fallback Component (using Html from drei)
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
// TextureUploader Component
// Reads a file as a data URL and passes it to onUpload.
// ----------------------------------------------------------------
function TextureUploader({
  onUpload,
}: {
  onUpload: (texture: { label: string; url: string; custom: boolean }) => void;
}) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onUpload({ label: file.name, url: dataUrl, custom: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ fontSize: 13, cursor: "pointer" }}>
        <input
          type="file"
          accept="image/*"
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
          Upload Texture
        </span>
      </label>
    </div>
  );
}

// ----------------------------------------------------------------
// Curtain Component
// Loads the Curtain4 model and applies the selected texture.
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
        const material = new MeshStandardMaterial({
          color: 0xffffff,
          map: texture || null,
        });
        // Ensure the texture map uses sRGB encoding if it exists
        if (texture && material.map) {
          material.map.encoding = sRGBEncoding;
        }
        child.material = material;
      }
    });
  }, [scene, texture]);

  return <primitive object={scene} />;
}

// ----------------------------------------------------------------
// Main App Component
// ----------------------------------------------------------------
function App() {
  // React 18 transition helper
  const [, startTransitionFn] = useTransition();

  // --------------------------------------------------------------
  // Use only Curtain4 Model (hardcoded URL)
  // --------------------------------------------------------------
  const modelUrl = "https://elasticbeanstalk-us-east-2-381492242150.s3.us-east-2.amazonaws.com/resources/_runtime/_embedded_extensions/maya/curtain1.glb";


  // --------------------------------------------------------------
  // Texture Options (Default + Custom)
  // Default textures are hardcoded; custom textures are stored in sessionStorage.
  // --------------------------------------------------------------
  const defaultTextures = [
    { label: "Texture 1", url: "/assets/textures/texture1.jpg", custom: false },
    { label: "Texture 2", url: "/assets/textures/texture2.jpg", custom: false },
    { label: "Texture 3", url: "/assets/textures/texture3.jpg", custom: false },
    { label: "Texture 4", url: "/assets/textures/texture4.jpg", custom: false },
  ];
  const [textureOptions, setTextureOptions] = useState(defaultTextures);
  const [textureUrl, setTextureUrl] = useState<string>(defaultTextures[0].url);

  // Load custom textures from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("customTextures");
    if (stored) {
      const custom = JSON.parse(stored);
      setTextureOptions([...defaultTextures, ...custom]);
    }
  }, []);

  // Whenever textureOptions changes, update sessionStorage for custom ones
  useEffect(() => {
    const custom = textureOptions.filter((tex) => tex.custom);
    sessionStorage.setItem("customTextures", JSON.stringify(custom));
  }, [textureOptions]);

  const handleTextureSelect = (url: string) => {
    startTransitionFn(() => {
      setTextureUrl(url);
    });
  };

  const addCustomTexture = (texture: {
    label: string;
    url: string;
    custom: boolean;
  }) => {
    setTextureOptions((prev) => [...prev, texture]);
    setTextureUrl(texture.url);
  };

  const removeCustomTexture = (url: string) => {
    setTextureOptions((prev) => {
      const newOptions = prev.filter((tex) => tex.url !== url);
      if (textureUrl === url) {
        if (newOptions.length > 0) {
          setTextureUrl(newOptions[0].url);
        } else {
          setTextureUrl("");
        }
      }
      return newOptions;
    });
  };

  // --------------------------------------------------------------
  // Curtain Transform State (Position and Rotation)
  // Loaded from localStorage (key: "curtainTransform")
  // --------------------------------------------------------------
  type Transform = { position: [number, number, number]; rotation: [number, number, number] };
  const [curtainTransform, setCurtainTransform] = useState<Transform>({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  });
  const curtainRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const saved = localStorage.getItem("curtainTransform");
    if (saved) {
      setCurtainTransform(JSON.parse(saved));
    }
  }, []);

  const handleSaveTransform = () => {
    if (curtainRef.current) {
      const pos = curtainRef.current.position.toArray();
      const rot = curtainRef.current.rotation.toArray();
      const transform: Transform = { position: pos as [number, number, number], rotation: rot as [number, number, number] };
      localStorage.setItem("curtainTransform", JSON.stringify(transform));
      setCurtainTransform(transform);
      alert("Curtain transform saved!");
    }
  };

  // --------------------------------------------------------------
  // Transform Mode Toggle (translate or rotate)
  // --------------------------------------------------------------
  const [transformMode, setTransformMode] = useState<"translate" | "rotate">("translate");
  const toggleMode = () => {
    setTransformMode((prev) => (prev === "translate" ? "rotate" : "translate"));
  };

  // --------------------------------------------------------------
  // Leva Controls for Lighting, Repeat, Environment
  // --------------------------------------------------------------
  const { lightIntensity } = useControls("Lighting", {
    lightIntensity: { value: 1, min: 0, max: 10, step: 0.1 },
  });
  const { repeatX, repeatY, mirrorWrapX, mirrorWrapY } = useControls("Repeat", {
    repeatX: { value: 1, min: 1, max: 10, step: 1 },
    repeatY: { value: 1, min: 1, max: 10, step: 1 },
    mirrorWrapX: { value: false },
    mirrorWrapY: { value: false },
  });
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
  // Load and configure the selected texture
  // --------------------------------------------------------------
  const texture = useLoader(TextureLoader, textureUrl);
  useEffect(() => {
    if (texture) {
      // Set the texture to use sRGB encoding to maintain its true color
      texture.encoding = sRGBEncoding;
      texture.wrapS = mirrorWrapX ? MirroredRepeatWrapping : RepeatWrapping;
      texture.wrapT = mirrorWrapY ? MirroredRepeatWrapping : RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.needsUpdate = true;
    }
  }, [texture, mirrorWrapX, mirrorWrapY, repeatX, repeatY]);

  // --------------------------------------------------------------
  // UI Panel & Button Styles
  // --------------------------------------------------------------
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
  const saveButtonStyle: CSSProperties = {
    position: "fixed",
    top: 20,
    right: 20,
    background: "#3a3a3a",
    color: "#ccc",
    border: "none",
    padding: "8px 12px",
    borderRadius: 4,
    cursor: "pointer",
    zIndex: 20,
  };
  const toggleButtonStyle: CSSProperties = {
    position: "fixed",
    top: 60,
    right: 20,
    background: "#3a3a3a",
    color: "#ccc",
    border: "none",
    padding: "8px 12px",
    borderRadius: 4,
    cursor: "pointer",
    zIndex: 20,
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* Save Transform Button */}
      <button style={saveButtonStyle} onClick={handleSaveTransform}>
        Save Transform
      </button>
      {/* Toggle Transform Mode Button */}
      <button style={toggleButtonStyle} onClick={toggleMode}>
        Mode: {transformMode}
      </button>

      {/* LEFT PANEL: Texture selection, upload, and preview */}
      <div style={panelStyle}>
        <div>
          <div style={sectionTitle}>Select Texture</div>
          <div style={radioGroupStyle}>
            {textureOptions.map((option) => (
              <div
                key={option.url}
                style={{ display: "flex", alignItems: "center" }}
              >
                <label style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="texture"
                    checked={textureUrl === option.url}
                    onChange={() => handleTextureSelect(option.url)}
                    style={{ cursor: "pointer" }}
                  />
                  <span>{option.label}</span>
                </label>
                {option.custom && (
                  <button
                    style={{
                      marginLeft: "auto",
                      background: "red",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                    onClick={() => removeCustomTexture(option.url)}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Texture Uploader */}
          <TextureUploader onUpload={addCustomTexture} />

          {/* Texture Preview */}
          <div style={texturePreviewStyle}>
            <div style={{ fontWeight: 500 }}>Preview:</div>
            <img src={textureUrl} alt="Texture Preview" style={previewImgStyle} />
          </div>
        </div>
      </div>

      {/* Leva Panel (top-right by default) */}
      <Leva collapsed={false} oneLineLabels hideCopyButton />

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }} gl={{ outputEncoding: sRGBEncoding }}>
        {EnvironmentMap !== "none" && (
          <Environment files={`/assets/environments/${EnvironmentMap}.hdr`} />
        )}

        <OrbitControls enablePan enableZoom enableRotate />

        <directionalLight position={[5, 10, 5]} intensity={lightIntensity} />
        <ambientLight intensity={0.3} />

        <Suspense fallback={<LoadingFallback />}>
          {/* Wrap the Curtain in TransformControls to allow moving/rotating */}
          <TransformControls mode={transformMode}>
            <group
              ref={curtainRef}
              position={curtainTransform.position}
              rotation={curtainTransform.rotation}
            >
              <Curtain modelUrl={modelUrl} texture={texture} />
            </group>
          </TransformControls>
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
