"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, Loader2, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

export function QrScannerDialog({
  actionLabel,
  description,
  onDetected,
  triggerClassName,
  triggerSize = "default",
  triggerVariant = "outline",
}: {
  actionLabel: string;
  description: string;
  onDetected: (token: string) => Promise<void> | void;
  triggerClassName?: string;
  triggerSize?: ButtonProps["size"];
  triggerVariant?: ButtonProps["variant"];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Point the camera at the rotating company QR code.");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stopScanner = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const scanLoop = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const context = canvasRef.current.getContext("2d");

    if (!context || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(() => {
        void scanLoop();
      });
      return;
    }

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const image = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const result = jsQR(image.data, image.width, image.height);

    if (result?.data) {
      setStatus("QR code verified. Sending secure token...");
      setIsBusy(true);
      await onDetectedRef.current(result.data);
      setIsBusy(false);
      setOpen(false);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      void scanLoop();
    });
  }, []);

  const startScanner = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
      },
      audio: false,
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    void scanLoop();
  }, [scanLoop]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    void startScanner();
    return () => stopScanner();
  }, [open, startScanner, stopScanner]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className={triggerClassName} size={triggerSize} type="button" variant={triggerVariant}>
          <QrCode className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-border bg-slate-950">
            <video autoPlay className="aspect-video w-full object-cover" muted playsInline ref={videoRef} />
            <canvas className="hidden" ref={canvasRef} />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Camera className="h-4 w-4 text-primary" />}
            <span>{status}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
