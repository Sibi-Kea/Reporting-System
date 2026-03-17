export type FacePoint = {
  x: number;
  y: number;
  z?: number;
};

const faceTemplatePoints = [1, 33, 61, 133, 152, 199, 234, 263, 291, 308, 362, 386];
const leftEyeIndices = [33, 160, 158, 133, 153, 144];
const rightEyeIndices = [362, 385, 387, 263, 373, 380];

function distance(a: FacePoint, b: FacePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildFaceTemplate(points: FacePoint[]) {
  const leftEye = points[33];
  const rightEye = points[263];
  const nose = points[1];
  const scale = Math.max(distance(leftEye, rightEye), 0.0001);

  return faceTemplatePoints.flatMap((index) => {
    const point = points[index];
    return [
      Number(((point.x - nose.x) / scale).toFixed(6)),
      Number(((point.y - nose.y) / scale).toFixed(6)),
      Number((((point.z ?? 0) - (nose.z ?? 0)) / scale).toFixed(6)),
    ];
  });
}

export function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function eyeAspectRatio(points: FacePoint[], indices: number[]) {
  const [p1, p2, p3, p4, p5, p6] = indices.map((index) => points[index]);
  const verticalA = distance(p2, p6);
  const verticalB = distance(p3, p5);
  const horizontal = distance(p1, p4);
  return (verticalA + verticalB) / (2 * horizontal);
}

export function getBlinkMetric(points: FacePoint[]) {
  return {
    left: eyeAspectRatio(points, leftEyeIndices),
    right: eyeAspectRatio(points, rightEyeIndices),
  };
}

export function getHeadTurnMetric(points: FacePoint[]) {
  const leftEye = points[33];
  const rightEye = points[263];
  const nose = points[1];
  const midpoint = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };

  return nose.x - midpoint.x;
}
