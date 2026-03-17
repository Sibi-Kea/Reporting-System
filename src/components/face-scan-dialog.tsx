"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { buildFaceTemplate, getBlinkMetric, getHeadTurnMetric } from "@/lib/face-template";

type FaceScanDialogProps = {
  actionLabel: string;
  description: string;
  onComplete: (payload: { biometricVector: number[]; livenessPassed: boolean }) => Promise<void> | void;
  triggerClassName?: string;
  triggerSize?: ButtonProps["size"];
  triggerVariant?: ButtonProps["variant"];
};

export function FaceScanDialog({
  actionLabel,
  description,
  onComplete,
  triggerClassName,
  triggerSize = "default",
  triggerVariant = "outline",
}: FaceScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{
    estimateFaces: (input: HTMLVideoElement, options: { flipHorizontal: boolean }) => Promise<Array<{ keypoints: Array<{ x: number; y: number; z?: number }> }>>;
  } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const challengeStateRef = useRef<"blink" | "turn" | "complete">("blink");
  const onCompleteRef = useRef(onComplete);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Align your face with the camera frame.");
  const [isBusy, setIsBusy] = useState(false);
  const [challengeState, setChallengeState] = useState<"blink" | "turn" | "complete">("blink");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    challengeStateRef.current = "blink";
    setChallengeState("blink");
    setStatus("Align your face with the camera frame.");
  }, []);

  const detectLoop = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current) {
      return;
    }

    const faces = await detectorRef.current.estimateFaces(videoRef.current, {
      flipHorizontal: true,
    });

    const face = faces[0];

    if (!face) {
      setStatus("No face detected. Move into frame.");
      animationFrameRef.current = requestAnimationFrame(() => {
        void detectLoop();
      });
      return;
    }

    const keypoints = face.keypoints.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
    }));

    const blinkMetric = getBlinkMetric(keypoints);
    const headTurnMetric = getHeadTurnMetric(keypoints);
    const currentChallenge = challengeStateRef.current;

    if (currentChallenge === "blink") {
      setStatus("Blink once to prove liveness.");
      if (blinkMetric.left < 0.18 && blinkMetric.right < 0.18) {
        challengeStateRef.current = "turn";
        setChallengeState("turn");
      }
    } else if (currentChallenge === "turn") {
      setStatus("Turn your head slightly left or right.");
      if (Math.abs(headTurnMetric) > 0.02) {
        challengeStateRef.current = "complete";
        setChallengeState("complete");
        setStatus("Face verified. Processing secure template...");
        const biometricVector = buildFaceTemplate(keypoints);
        setIsBusy(true);
        await onCompleteRef.current({
          biometricVector,
          livenessPassed: true,
        });
        setIsBusy(false);
        setOpen(false);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      void detectLoop();
    });
  }, []);

  const startCamera = useCallback(async () => {
    setStatus("Starting camera...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
      },
      audio: false,
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const tf = await import("@tensorflow/tfjs");
    await import("@tensorflow/tfjs-backend-webgl");
    const faceLandmarksDetection = await import("@tensorflow-models/face-landmarks-detection");

    await tf.setBackend("webgl");
    await tf.ready();

    detectorRef.current = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      {
        runtime: "tfjs",
        refineLandmarks: true,
        maxFaces: 1,
      },
    );

    void detectLoop();
  }, [detectLoop]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    void startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className={triggerClassName} size={triggerSize} type="button" variant={triggerVariant}>
          <Camera className="mr-2 h-4 w-4" />
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
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
            <span>{status}</span>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 text-sm">
            <p className={challengeState === "blink" ? "font-semibold text-foreground" : "text-muted-foreground"}>1. Blink challenge</p>
            <p className={challengeState === "turn" ? "font-semibold text-foreground" : "text-muted-foreground"}>2. Head movement challenge</p>
            <p className={challengeState === "complete" ? "font-semibold text-foreground" : "text-muted-foreground"}>3. Encrypted template handoff</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
