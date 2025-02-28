import React, {
  useState,
  useEffect,
  Suspense,
  startTransition,
  useTransition,
  CSSProperties,
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
// TextureUploader Component
// ----------------------------------------------------------------
function TextureUploader({
  onUpload,
}: {
  onUpload: (texture: { label: string; url: string; custom: boolean }) => void;
}) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const url = URL.createObjectURL(file);
      onUpload({ label: file.name, url, custom: true });
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
  // Only Curtain4 Model is used
  // --------------------------------------------------------------
  const modelUrl =
    "https://acunlkftz6rzylc6.public.blob.vercel-storage.com/curtain1-PiGAC9JDKy03usM4Fg5PG3ekSth0Ps.glb";

  // --------------------------------------------------------------
  // Textures State (Default and Custom)
  // --------------------------------------------------------------
  const initialTextureOptions = [
    { label: "Texture 1", url: "/assets/textures/texture1.jpg", custom: false },
    { label: "Texture 2", url: "/assets/textures/texture2.jpg", custom: false },
    { label: "Texture 3", url: "/assets/textures/texture3.jpg", custom: false },
    { label: "Texture 4", url: "/assets/textures/texture4.jpg", custom: false },
  ];
  const [textureOptions, setTextureOptions] = useState(initialTextureOptions);
  const [textureUrl, setTextureUrl] = useState<string>(
    initialTextureOptions[0].url
  );

  function handleTextureSelect(url: string) {
    startTransitionFn(() => {
      setTextureUrl(url);
    });
  }

  const addCustomTexture = (texture: {
    label: string;
    url: string;
    custom: boolean;
  }) => {
    setTextureOptions((prev) => [...prev, texture]);
    // Automatically select the newly uploaded texture
    setTextureUrl(texture.url);
  };

  const removeCustomTexture = (url: string) => {
    setTextureOptions((prev) => {
      const newOptions = prev.filter((tex) => tex.url !== url);
      if (textureUrl === url) {
        // If the removed texture is currently selected, fallback to the first available texture.
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
  // Left Panel (Leva-like style) for Texture Selection, Upload, and Preview
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

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* LEFT PANEL (texture selection, upload, and preview) */}
      <div style={panelStyle}>
        {/* Textures Section */}
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

      {/* Leva Panel => top-right by default */}
      <Leva collapsed={false} oneLineLabels hideCopyButton />

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }}>
        {/* Environment Map if not "none" */}
        {EnvironmentMap !== "none" && (
          <Environment files={`/assets/environments/${EnvironmentMap}.hdr`} />
        )}

        {/* Orbit Controls */}
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
