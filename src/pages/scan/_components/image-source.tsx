import { useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  ImagePlus,
  Images,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { useCamera } from "@/hooks/use-camera.ts";

type ImageSourceProps = {
  onSelect: (file: Blob, previewUrl: string) => void;
  onSelectMultiple?: (files: File[]) => void;
  disabled?: boolean;
};

export default function ImageSource({
  onSelect,
  onSelectMultiple,
  disabled,
}: ImageSourceProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const bulkFileInput = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const {
    videoRef,
    stream,
    isLoading,
    error,
    isSupported,
    isDenied,
    start,
    stop,
    switchCamera,
    capturePhoto,
  } = useCamera();

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    stop();
    onSelect(file, URL.createObjectURL(file));
  };

  const handleFiles = (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    stop();
    if (images.length === 1 || !onSelectMultiple) {
      handleFile(images[0]);
      return;
    }
    onSelectMultiple(images);
  };

  const handleCapture = async () => {
    const blob = await capturePhoto();
    if (!blob) return;
    stop();
    onSelect(blob, URL.createObjectURL(blob));
  };

  return (
    <div id="passport-image-source" className="space-y-4">
      <input
        ref={fileInput}
        id="passport-image-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <input
        ref={bulkFileInput}
        id="passport-bulk-image-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          handleFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {stream ? (
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-[4/3] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover"
            />
            {/* Alignment guide for the passport page */}
            <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-dashed border-white/60" />
            <span className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              Fill the frame with the photo page
            </span>
          </div>
          <div className="flex gap-2 p-4">
            <Button onClick={handleCapture} className="flex-1">
              <Camera className="size-4" />
              Capture
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={switchCamera}
              aria-label="Switch camera"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={stop}
              aria-label="Close camera"
            >
              <X className="size-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFiles(Array.from(event.dataTransfer.files));
          }}
          className={
            "border-border bg-card flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors " +
            (isDragging ? "border-ring bg-accent/40" : "")
          }
        >
          <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-full">
            <ImagePlus className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Add a passport image</p>
            <p className="text-muted-foreground text-sm">
              Drop one or more photos here, or choose an option below. JPG,
              PNG or HEIC.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              id="passport-import-button"
              disabled={disabled}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus className="size-4" />
              Import picture
            </Button>
            <Button
              variant="secondary"
              disabled={disabled || isLoading}
              onClick={start}
            >
              {isSupported ? (
                <Camera className="size-4" />
              ) : (
                <CameraOff className="size-4" />
              )}
              {isLoading ? "Starting camera..." : "Take picture"}
            </Button>
            {onSelectMultiple && (
              <Button
                id="passport-bulk-import-button"
                variant="secondary"
                disabled={disabled}
                onClick={() => bulkFileInput.current?.click()}
              >
                <Images className="size-4" />
                Import multiple
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            {isDenied &&
              " Enable camera access in your browser settings, then try again. You can still import a picture."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
