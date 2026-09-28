import { useCallback, useEffect, useRef, useState } from "react";

export type FacingMode = "user" | "environment";

export function useCamera(options: { facingMode?: FacingMode } = {}) {
  const { facingMode = "environment" } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDenied, setIsDenied] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] =
    useState<FacingMode>(facingMode);

  const isSupported =
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices;

  const stop = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setError("Camera is not supported on this device");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(mediaStream);
      setIsDenied(false);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      const name = (err as Error).name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setIsDenied(true);
        setError("Camera permission was denied");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No camera found on this device");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("The camera is already in use by another app");
      } else {
        setError("Could not access the camera");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, currentFacingMode]);

  const switchCamera = useCallback(() => {
    stop();
    setCurrentFacingMode((mode) => (mode === "user" ? "environment" : "user"));
  }, [stop]);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !stream) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92),
    );
  }, [stream]);

  // Keep the <video> element bound to the active stream across re-mounts.
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  // Stop all tracks when the component unmounts.
  useEffect(
    () => () => stream?.getTracks().forEach((track) => track.stop()),
    [stream],
  );

  return {
    videoRef,
    stream,
    isLoading,
    error,
    isSupported,
    isDenied,
    facingMode: currentFacingMode,
    start,
    stop,
    switchCamera,
    capturePhoto,
  };
}
