import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Rect, Transformer, Line } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import { Undo2, Redo2, Sun, Crop, Trash2, Download, ImagePlus, Check, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import logoUrl from "@/assets/carousel-crave-logo.png";

type ImgItem = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  brightness: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  naturalW: number;
  naturalH: number;
};

function CanvasImage({
  item,
  isSelected,
  isCropping,
  cropActive,
  snapXs,
  snapYs,
  snapThreshold,
  onSelect,
  onChange,
}: {
  item: ImgItem;
  isSelected: boolean;
  isCropping: boolean;
  cropActive: boolean;
  snapXs: number[];
  snapYs: number[];
  snapThreshold: number;
  onSelect: () => void;
  onChange: (i: ImgItem) => void;
}) {
  const [img] = useImage(item.src, "anonymous");
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && !isCropping && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    } else if (trRef.current) {
      trRef.current.nodes([]);
    }
  }, [isSelected, isCropping]);

  useEffect(() => {
    const node = shapeRef.current;
    if (!node || !img) return;
    node.cache();
    node.filters([Konva.Filters.Brighten]);
    node.brightness(item.brightness);
    node.getLayer()?.batchDraw();
  }, [img, item.brightness, item.width, item.height, item.cropX, item.cropY, item.cropW, item.cropH]);

  // When cropping is active globally, only the cropping image is interactive.
  const interactive = !cropActive || isCropping;

  return (
    <>
      <KImage
        ref={shapeRef}
        image={img}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        crop={{ x: item.cropX, y: item.cropY, width: item.cropW, height: item.cropH }}
        draggable={interactive}
        listening={interactive}
        onClick={interactive ? onSelect : undefined}
        onTap={interactive ? onSelect : undefined}
        onDragMove={(e) => {
          if (isCropping) return; // panning handled in onDragEnd
          const node = e.target;
          const x = node.x();
          const y = node.y();
          const w = item.width;
          const h = item.height;
          const candidatesX: { v: number; offset: number }[] = [];
          const candidatesY: { v: number; offset: number }[] = [];
          for (const sx of snapXs) {
            candidatesX.push({ v: sx, offset: 0 });
            candidatesX.push({ v: sx - w, offset: w });
            candidatesX.push({ v: sx - w / 2, offset: w / 2 });
          }
          for (const sy of snapYs) {
            candidatesY.push({ v: sy, offset: 0 });
            candidatesY.push({ v: sy - h, offset: h });
            candidatesY.push({ v: sy - h / 2, offset: h / 2 });
          }
          let bestX = x, bdx = snapThreshold;
          for (const c of candidatesX) {
            const d = Math.abs(x - c.v);
            if (d < bdx) { bdx = d; bestX = c.v; }
          }
          let bestY = y, bdy = snapThreshold;
          for (const c of candidatesY) {
            const d = Math.abs(y - c.v);
            if (d < bdy) { bdy = d; bestY = c.v; }
          }
          if (bestX !== x) node.x(bestX);
          if (bestY !== y) node.y(bestY);
        }}
        onDragEnd={(e) => {
          if (isCropping) {
            // Pan the source image inside the fixed crop window.
            const node = e.target;
            const dx = node.x() - item.x;
            const dy = node.y() - item.y;
            const rx = item.cropW / item.width;
            const ry = item.cropH / item.height;
            // Dragging the image right reveals content to its left → cropX decreases.
            let newCropX = item.cropX - dx * rx;
            let newCropY = item.cropY - dy * ry;
            newCropX = Math.max(0, Math.min(newCropX, item.naturalW - item.cropW));
            newCropY = Math.max(0, Math.min(newCropY, item.naturalH - item.cropH));
            // Reset node position back to canvas anchor.
            node.x(item.x);
            node.y(item.y);
            onChange({ ...item, cropX: newCropX, cropY: newCropY });
            return;
          }
          onChange({ ...item, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...item,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
          });
        }}
      />
      {isSelected && !isCropping && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          anchorStroke="#22d3ee"
          anchorFill="#0f172a"
          borderStroke="#22d3ee"
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
          }
        />
      )}
    </>
  );
}

function CropOverlay({
  item,
  onChange,
}: {
  item: ImgItem;
  onChange: (i: ImgItem) => void;
}) {
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (rectRef.current && trRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, []);

  const rx = item.cropW / item.width;
  const ry = item.cropH / item.height;

  return (
    <>
      <Rect
        ref={rectRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        stroke="#22d3ee"
        strokeWidth={2}
        dash={[8, 6]}
        draggable
        onDragEnd={(e) => {
          const dx = e.target.x() - item.x;
          const dy = e.target.y() - item.y;
          let newCropX = item.cropX + dx * rx;
          let newCropY = item.cropY + dy * ry;
          newCropX = Math.max(0, Math.min(newCropX, item.naturalW - item.cropW));
          newCropY = Math.max(0, Math.min(newCropY, item.naturalH - item.cropH));
          onChange({
            ...item,
            x: e.target.x(),
            y: e.target.y(),
            cropX: newCropX,
            cropY: newCropY,
          });
        }}
        onTransformEnd={() => {
          const node = rectRef.current!;
          const sX = node.scaleX();
          const sY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          const newX = node.x();
          const newY = node.y();
          const newW = Math.max(20, node.width() * sX);
          const newH = Math.max(20, node.height() * sY);

          const a = -item.rotation * Math.PI / 180;
          const dxw = newX - item.x;
          const dyw = newY - item.y;
          const localDx = dxw * Math.cos(a) - dyw * Math.sin(a);
          const localDy = dxw * Math.sin(a) + dyw * Math.cos(a);

          let newCropX = item.cropX + localDx * rx;
          let newCropY = item.cropY + localDy * ry;
          let newCropW = newW * rx;
          let newCropH = newH * ry;

          newCropX = Math.max(0, Math.min(newCropX, item.naturalW - 1));
          newCropY = Math.max(0, Math.min(newCropY, item.naturalH - 1));
          newCropW = Math.max(1, Math.min(newCropW, item.naturalW - newCropX));
          newCropH = Math.max(1, Math.min(newCropH, item.naturalH - newCropY));

          onChange({
            ...item,
            x: newX,
            y: newY,
            width: newCropW / rx,
            height: newCropH / ry,
            cropX: newCropX,
            cropY: newCropY,
            cropW: newCropW,
            cropH: newCropH,
          });
        }}
      />
      <Transformer
        ref={trRef}
        rotateEnabled={false}
        keepRatio={false}
        enabledAnchors={[
          "top-left", "top-center", "top-right",
          "middle-left", "middle-right",
          "bottom-left", "bottom-center", "bottom-right",
        ]}
        anchorStroke="#22d3ee"
        anchorFill="#0f172a"
        borderStroke="#22d3ee"
        boundBoxFunc={(oldBox, newBox) =>
          newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
        }
      />
    </>
  );
}

function IconBtn({
  onClick, disabled, active, title, children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={
        "h-9 w-9 inline-flex items-center justify-center rounded-md border transition-all disabled:opacity-40 disabled:cursor-not-allowed " +
        (active
          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_var(--primary)]"
          : "border-border bg-card/40 backdrop-blur hover:border-primary hover:text-primary hover:shadow-[0_0_10px_var(--primary)]")
      }
    >
      {children}
    </button>
  );
}

export default function CarouselEditor() {
  const [panels, setPanels] = useState(3);
  const [isDragOver, setIsDragOver] = useState(false);
  const [panelW, setPanelW] = useState(1080);
  const [panelH, setPanelH] = useState(1350);
  // Pending input values (only commit on submit / Enter)
  const [pendingW, setPendingW] = useState("1080");
  const [pendingH, setPendingH] = useState("1350");
  const [bgColor, setBgColor] = useState("#0b1220");
  const [items, setItems] = useState<ImgItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const overlayLayerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const historyRef = useRef<ImgItem[][]>([[]]);
  const redoRef = useRef<ImgItem[][]>([]);
  const skipHistoryRef = useRef(false);
  const [cropId, setCropId] = useState<string | null>(null);
  const [brightnessOpen, setBrightnessOpen] = useState(false);

  const totalW = panelW * panels;

  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    historyRef.current.push(items);
    if (historyRef.current.length > 80) historyRef.current.shift();
    redoRef.current = [];
  }, [items]);

  const undo = () => {
    const h = historyRef.current;
    if (h.length <= 1) return;
    const cur = h.pop()!;
    redoRef.current.push(cur);
    skipHistoryRef.current = true;
    setItems(h[h.length - 1]);
  };
  const redo = () => {
    const r = redoRef.current;
    if (r.length === 0) return;
    const next = r.pop()!;
    historyRef.current.push(next);
    skipHistoryRef.current = true;
    setItems(next);
  };

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth - 32;
      setScale(Math.min(1, w / totalW));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [totalW]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const probe = new window.Image();
        probe.onload = () => {
          const maxW = panelW * 0.8;
          const r = probe.width / probe.height;
          const width = Math.min(maxW, probe.width);
          const height = width / r;
          setItems((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
              src,
              x: 50 + idx * 30,
              y: 50 + idx * 30,
              width,
              height,
              rotation: 0,
              brightness: 0,
              cropX: 0,
              cropY: 0,
              cropW: probe.width,
              cropH: probe.height,
              naturalW: probe.width,
              naturalH: probe.height,
            },
          ]);
        };
        probe.src = src;
      };
      reader.readAsDataURL(file);
    });
  };

  const deleteSelected = () => {
    if (!selectedId || cropId) return;
    setItems((p) => p.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  const bringForward = () => {
    if (!selectedId || cropId) return;
    setItems((p) => {
      const i = p.findIndex((x) => x.id === selectedId);
      if (i < 0 || i === p.length - 1) return p;
      const c = [...p];
      [c[i], c[i + 1]] = [c[i + 1], c[i]];
      return c;
    });
  };
  const sendBackward = () => {
    if (!selectedId || cropId) return;
    setItems((p) => {
      const i = p.findIndex((x) => x.id === selectedId);
      if (i <= 0) return p;
      const c = [...p];
      [c[i], c[i - 1]] = [c[i - 1], c[i]];
      return c;
    });
  };

  // Snap targets: canvas edges + each panel break
  const snapXs = [0, totalW, ...Array.from({ length: panels + 1 }, (_, i) => i * panelW)];
  const snapYs = [0, panelH];
  const snapThreshold = 8 / scale; // ~8 screen px regardless of zoom

  const toggleCrop = () => {
    if (cropId) setCropId(null);
    else if (selectedId) {
      setCropId(selectedId);
      setBrightnessOpen(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault(); redo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault(); undo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault(); redo(); return;
      }
      if (cropId && (e.key === "Enter" || e.key === "Escape")) {
        e.preventDefault();
        setCropId(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !cropId) {
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const exportPanels = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    setSelectedId(null);
    setCropId(null);
    setBrightnessOpen(false);

    const overlay = overlayLayerRef.current;
    const overlayWasVisible = overlay?.visible() ?? true;
    overlay?.visible(false);

    await new Promise((r) => setTimeout(r, 80));

    const prevScale = stage.scaleX();
    const prevW = stage.width();
    const prevH = stage.height();
    stage.scale({ x: 1, y: 1 });
    stage.size({ width: totalW, height: panelH });

    try {
      const urls: string[] = [];
      for (let i = 0; i < panels; i++) {
        urls.push(stage.toDataURL({
          x: i * panelW, y: 0, width: panelW, height: panelH,
          pixelRatio: 1, mimeType: "image/jpeg", quality: 0.95,
        }));
      }
      for (let i = 0; i < urls.length; i++) {
        const a = document.createElement("a");
        a.href = urls[i];
        a.download = `panel-${i + 1}.jpg`;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      stage.scale({ x: prevScale, y: prevScale });
      stage.size({ width: prevW, height: prevH });
      overlay?.visible(overlayWasVisible);
      overlay?.batchDraw();
    }
  };

  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) : null;
  const cropItem = cropId ? items.find((i) => i.id === cropId) : null;

  const submitSize = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Math.max(100, Math.min(4000, parseInt(pendingW) || 1080));
    const h = Math.max(100, Math.min(4000, parseInt(pendingH) || 1350));
    setPanelW(w);
    setPanelH(h);
    setPendingW(String(w));
    setPendingH(String(h));
  };

  return (
    <div className="min-h-screen text-foreground" onClick={() => { setBrightnessOpen(false); }}>
      <header className="border-b border-border/60 bg-card/30 backdrop-blur-xl px-6 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-40">
        <div className="mr-auto flex items-center gap-3">
          <img src={logoUrl} alt="Carousel Crave" className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
          <h1 className="text-lg font-semibold tracking-[0.3em] uppercase bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Carousel<span className="text-foreground/50">//</span>Crave
          </h1>
        </div>

        <label className="text-xs flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          Panels
          <input
            type="number" min={1} max={10} value={panels}
            onChange={(e) => setPanels(Math.max(1, Math.min(10, +e.target.value || 1)))}
            className="w-14 h-9 px-2 rounded-md border border-border bg-input/50 text-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_8px_var(--primary)]"
          />
        </label>

        <form onSubmit={submitSize} className="flex items-center gap-2">
          <label className="text-xs flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            W
            <input
              type="number" min={100} max={4000} value={pendingW}
              onChange={(e) => setPendingW(e.target.value)}
              className="w-20 h-9 px-2 rounded-md border border-border bg-input/50 text-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_8px_var(--primary)]"
            />
          </label>
          <label className="text-xs flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            H
            <input
              type="number" min={100} max={4000} value={pendingH}
              onChange={(e) => setPendingH(e.target.value)}
              className="w-20 h-9 px-2 rounded-md border border-border bg-input/50 text-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_8px_var(--primary)]"
            />
          </label>
          <button
            type="submit"
            title="Apply size (Enter)"
            className="h-9 px-3 inline-flex items-center gap-1 rounded-md border border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground transition-all text-xs uppercase tracking-wider"
          >
            <Check size={14} /> Set
          </button>
        </form>

        <label className="text-xs flex items-center gap-2 text-muted-foreground uppercase tracking-wider" title="Background color">
          BG
          <input
            type="color" value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="h-9 w-10 rounded-md border border-border bg-transparent cursor-pointer"
          />
        </label>

        <label className="cursor-pointer h-9 inline-flex items-center gap-2 rounded-md border border-border bg-card/40 backdrop-blur px-3 text-xs uppercase tracking-wider hover:border-primary hover:text-primary transition-all">
          <ImagePlus size={16} /> Add
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
        </label>

        <div className="h-6 w-px bg-border/60" />

        <IconBtn onClick={undo} disabled={historyRef.current.length <= 1} title="Undo (Ctrl/Cmd+Z)">
          <Undo2 size={16} />
        </IconBtn>
        <IconBtn onClick={redo} disabled={redoRef.current.length === 0} title="Redo (Ctrl/Cmd+Shift+Z)">
          <Redo2 size={16} />
        </IconBtn>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <IconBtn
            onClick={() => setBrightnessOpen((v) => !v)}
            disabled={!selectedItem || !!cropId}
            active={brightnessOpen}
            title="Brightness"
          >
            <Sun size={16} />
          </IconBtn>
          {brightnessOpen && selectedItem && (
            <div className="absolute right-0 top-full mt-2 z-50 rounded-md border border-border bg-popover/95 backdrop-blur-xl text-popover-foreground shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-3 w-56">
              <input
                type="range" min={-1} max={1} step={0.05} value={selectedItem.brightness}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setItems((p) => p.map((x) => x.id === selectedItem.id ? { ...x, brightness: v } : x));
                }}
                className="w-full accent-[var(--primary)]"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                <span>Dark</span>
                <span className="text-primary">{selectedItem.brightness.toFixed(2)}</span>
                <span>Bright</span>
              </div>
              <button
                className="mt-2 text-[10px] text-primary hover:underline uppercase tracking-wider"
                onClick={() => setItems((p) => p.map((x) => x.id === selectedItem.id ? { ...x, brightness: 0 } : x))}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <IconBtn
          onClick={toggleCrop}
          disabled={!selectedId}
          active={!!cropId}
          title={cropId ? "Finalize crop (Enter)" : "Crop"}
        >
          <Crop size={16} />
        </IconBtn>

        <IconBtn onClick={sendBackward} disabled={!selectedId || !!cropId} title="Send backward">
          <ArrowDownToLine size={16} />
        </IconBtn>
        <IconBtn onClick={bringForward} disabled={!selectedId || !!cropId} title="Bring forward">
          <ArrowUpToLine size={16} />
        </IconBtn>

        <IconBtn onClick={deleteSelected} disabled={!selectedId || !!cropId} title="Delete">
          <Trash2 size={16} />
        </IconBtn>

        <div className="h-6 w-px bg-border/60" />

        <button
          onClick={exportPanels}
          className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:shadow-[0_0_20px_var(--primary)] transition-all text-xs uppercase tracking-wider"
        >
          <Download size={14} /> Export {panels}
        </button>
      </header>

      {cropId && (
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-2 text-xs text-primary uppercase tracking-wider flex items-center gap-2">
          <Crop size={12} /> Crop mode — adjust handles, then click the crop icon or press Enter to finalize.
        </div>
      )}

      <div
        ref={containerRef}
        className={`p-4 overflow-auto relative ${isDragOver ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}`}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; }}
        onDragLeave={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          setIsDragOver(false);
          const files = e.dataTransfer?.files;
          if (files && files.length) handleFiles(files);
        }}
      >
        <div className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-mono">
          Canvas {totalW} × {panelH}px · {Math.round(scale * 100)}% · dashed = panel breaks
        </div>
        <div
          className="rounded-md inline-block ring-1 ring-border/60"
          style={{
            width: totalW * scale,
            height: panelH * scale,
            boxShadow: "var(--shadow-neon)",
          }}
        >
          <Stage
            ref={stageRef}
            width={totalW * scale}
            height={panelH * scale}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) {
                if (!cropId) setSelectedId(null);
              }
            }}
            onContextMenu={(e) => { e.evt.preventDefault(); }}
          >
            <Layer>
              <Rect x={0} y={0} width={totalW} height={panelH} fill={bgColor} />
            </Layer>
            <Layer>
              {items.map((it) => (
                <CanvasImage
                  key={it.id}
                  item={it}
                  isSelected={it.id === selectedId && it.id !== cropId}
                  isCropping={it.id === cropId}
                  cropActive={!!cropId}
                  snapXs={snapXs}
                  snapYs={snapYs}
                  snapThreshold={snapThreshold}
                  onSelect={() => { if (!cropId) setSelectedId(it.id); }}
                  onChange={(n) => setItems((p) => p.map((x) => (x.id === it.id ? n : x)))}
                />
              ))}
            </Layer>
            {cropItem && (
              <Layer>
                <CropOverlay
                  key={cropItem.id}
                  item={cropItem}
                  onChange={(n) => setItems((p) => p.map((x) => (x.id === cropItem.id ? n : x)))}
                />
              </Layer>
            )}
            <Layer ref={overlayLayerRef} listening={false}>
              {Array.from({ length: panels - 1 }).map((_, i) => (
                <Line
                  key={i}
                  points={[(i + 1) * panelW, 0, (i + 1) * panelW, panelH]}
                  stroke="#22d3ee"
                  strokeWidth={4}
                  dash={[20, 20]}
                  opacity={0.7}
                />
              ))}
              <Rect x={0} y={0} width={totalW} height={panelH} stroke="#22d3ee" strokeWidth={4} opacity={0.5} />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
