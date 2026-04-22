import { useRef, useState, useCallback } from "react";
import axios from "axios";

const API      = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/trainer`;
const USERNAME = "Cherry";
const CLOUDINARY_CLOUD_NAME = "dpefgyvua";
const CLOUDINARY_UPLOAD_PRESET = "ai_gym_uploads";
console.log("Cloud Name:", CLOUDINARY_CLOUD_NAME);
console.log("Upload Preset:", CLOUDINARY_UPLOAD_PRESET);
// ─── Angle calculator ──────────────────────────────────────────────────────────
function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

// ─── Canvas drawing helpers ────────────────────────────────────────────────────
function drawLine(ctx, p1, p2, color = "#a855f7", width = 3) {
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.stroke();
}

function drawDot(ctx, p, color = "#22c55e", radius = 8) {
  ctx.beginPath();
  ctx.arc(p[0], p[1], radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawAngleLabel(ctx, text, p) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(p[0] + 10, p[1] - 22, text.length * 10 + 10, 28);
  ctx.fillStyle  = "#fbbf24";
  ctx.font       = "bold 16px sans-serif";
  ctx.fillText(text, p[0] + 15, p[1] - 3);
}

// ─── Exercise analysers ────────────────────────────────────────────────────────

function analyseSquat(lm, W, H, stage) {
  const lHip   = { x: lm[23].x, y: lm[23].y };
  const lKnee  = { x: lm[25].x, y: lm[25].y };
  const lAnkle = { x: lm[27].x, y: lm[27].y };
  const rHip   = { x: lm[24].x, y: lm[24].y };
  const rKnee  = { x: lm[26].x, y: lm[26].y };
  const rAnkle = { x: lm[28].x, y: lm[28].y };

  const leftAngle  = calculateAngle(lHip,  lKnee,  lAnkle);
  const rightAngle = calculateAngle(rHip,  rKnee,  rAnkle);
  const angle      = (leftAngle + rightAngle) / 2;

  let newStage = stage;
  let counted  = false;
  if (angle > 160) newStage = "UP";
  if (angle < 95 && stage === "UP") { newStage = "DOWN"; counted = true; }

  const kneeOver =
    Math.abs(lm[25].x * W - lm[27].x * W) > W * 0.08 ||
    Math.abs(lm[26].x * W - lm[28].x * W) > W * 0.08;

  const feedback =
    kneeOver        ? "Knees too far forward — push hips back!" :
    angle > 160     ? "Standing — squat down slowly" :
    angle > 120     ? "Going down — keep back straight" :
    angle < 95      ? "Deep squat! Drive through heels" :
                      "Parallel depth — perfect!";

  const points = {
    lHip:   [lm[23].x * W, lm[23].y * H],
    lKnee:  [lm[25].x * W, lm[25].y * H],
    lAnkle: [lm[27].x * W, lm[27].y * H],
    rHip:   [lm[24].x * W, lm[24].y * H],
    rKnee:  [lm[26].x * W, lm[26].y * H],
    rAnkle: [lm[28].x * W, lm[28].y * H],
  };

  return { angle, stage: newStage, counted, feedback, points };
}

function analyseCurl(lm, W, H, stage, side) {
  const si = side === "left" ? [11, 13, 15] : [12, 14, 16];
  const a  = { x: lm[si[0]].x, y: lm[si[0]].y };
  const b  = { x: lm[si[1]].x, y: lm[si[1]].y };
  const c  = { x: lm[si[2]].x, y: lm[si[2]].y };
  const angle = calculateAngle(a, b, c);

  let newStage = stage;
  let counted  = false;
  if (angle > 160) newStage = "DOWN";
  if (angle < 35 && stage === "DOWN") { newStage = "UP"; counted = true; }

  const feedback =
    angle > 150 ? "Arm extended — curl up!" :
    angle < 40  ? "Full curl! Lower slowly" :
    angle > 90  ? "Halfway — keep curling" :
                  "Good form!";

  return {
    angle,
    stage: newStage,
    counted,
    feedback,
    points: {
      shoulder: [lm[si[0]].x * W, lm[si[0]].y * H],
      elbow:    [lm[si[1]].x * W, lm[si[1]].y * H],
      wrist:    [lm[si[2]].x * W, lm[si[2]].y * H],
    },
  };
}

function analysePosture(lm, W, H) {
  const nose     = [lm[0].x  * W, lm[0].y  * H];
  const lShoulder= [lm[11].x * W, lm[11].y * H];
  const rShoulder= [lm[12].x * W, lm[12].y * H];
  const lHip     = [lm[23].x * W, lm[23].y * H];
  const rHip     = [lm[24].x * W, lm[24].y * H];
  const lEar     = [lm[7].x  * W, lm[7].y  * H];
  const rEar     = [lm[8].x  * W, lm[8].y  * H];

  const midShoulder = [(lShoulder[0]+rShoulder[0])/2, (lShoulder[1]+rShoulder[1])/2];
  const midHip      = [(lHip[0]+rHip[0])/2,           (lHip[1]+rHip[1])/2];
  const midEar      = [(lEar[0]+rEar[0])/2,           (lEar[1]+rEar[1])/2];

  let score  = 100;
  const issues = [];

  if (Math.abs(lShoulder[1] - rShoulder[1]) / H > 0.04)
    { issues.push("Uneven shoulders — level them out"); score -= 25; }
  if (Math.abs(nose[0] - midShoulder[0]) / W > 0.06)
    { issues.push("Head tilted — centre your neck");    score -= 20; }
  if (Math.abs(midShoulder[0] - midHip[0]) / W > 0.05)
    { issues.push("Spine not vertical — stand straight"); score -= 25; }
  if ((midShoulder[1] - midEar[1]) < H * 0.05)
    { issues.push("Head dropping forward — lift chin"); score -= 15; }

  score = Math.max(0, score);
  const feedback =
    score >= 90 ? "Excellent posture!" :
    score >= 70 ? "Good — minor adjustments needed" :
    score >= 50 ? "Fair — see corrections below" :
                  "Poor posture — correct before continuing";

  return {
    score,
    issues: issues.length === 0 ? ["All checks passed!"] : issues,
    feedback,
    points: { nose, lShoulder, rShoulder, lHip, rHip, midShoulder, midHip },
  };
}

// ─── Canvas renderers ──────────────────────────────────────────────────────────

function renderSquat(ctx, pts, angle) {
  const c = angle < 100 ? "#22c55e" : "#f59e0b";
  drawLine(ctx, pts.lHip,   pts.lKnee,   "#a855f7");
  drawLine(ctx, pts.lKnee,  pts.lAnkle,  "#a855f7");
  drawLine(ctx, pts.rHip,   pts.rKnee,   "#7c3aed");
  drawLine(ctx, pts.rKnee,  pts.rAnkle,  "#7c3aed");
  drawLine(ctx, pts.lHip,   pts.rHip,    "#6b21a8", 2);
  [pts.lHip, pts.lKnee, pts.lAnkle, pts.rHip, pts.rKnee, pts.rAnkle]
    .forEach((p) => drawDot(ctx, p, c, 7));
  drawAngleLabel(ctx, `${Math.round(angle)}°`, pts.lKnee);
}

function renderCurl(ctx, pts, angle) {
  const c = angle < 60 ? "#ef4444" : "#22c55e";
  drawLine(ctx, pts.shoulder, pts.elbow, "#a855f7");
  drawLine(ctx, pts.elbow,    pts.wrist, "#a855f7");
  [pts.shoulder, pts.elbow, pts.wrist].forEach((p) => drawDot(ctx, p, c));
  drawAngleLabel(ctx, `${Math.round(angle)}°`, pts.elbow);
}

function renderPosture(ctx, pts, score) {
  const c = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  drawLine(ctx, pts.lShoulder, pts.rShoulder, c, 2);
  drawLine(ctx, pts.lHip,      pts.rHip,      c, 2);
  drawLine(ctx, pts.midShoulder, pts.midHip,  c, 2);
  drawLine(ctx, pts.nose,      pts.midShoulder, c, 1);
  [pts.lShoulder, pts.rShoulder, pts.lHip, pts.rHip, pts.nose]
    .forEach((p) => drawDot(ctx, p, c, 6));
  ctx.fillStyle = score >= 80 ? "rgba(34,197,94,0.85)"
                : score >= 60 ? "rgba(245,158,11,0.85)"
                :               "rgba(239,68,68,0.85)";
  ctx.beginPath();
  ctx.roundRect(10, 10, 116, 46, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font      = "bold 24px sans-serif";
  ctx.fillText(`${score}/100`, 18, 44);
}

// ─── Exercise config ───────────────────────────────────────────────────────────

const EXERCISES = [
  { id: "squat",      label: "Squats",       icon: "🏋️" },
  { id: "left_curl",  label: "Left Curl",    icon: "💪" },
  { id: "right_curl", label: "Right Curl",   icon: "💪" },
  { id: "posture",    label: "Posture Check", icon: "🧍" },
];

const TIPS = {
  squat:      "Stand 1.5–2 m back so full body (head to ankle) is visible.",
  left_curl:  "Keep your left elbow fixed — only the forearm moves.",
  right_curl: "Keep your right elbow fixed — only the forearm moves.",
  posture:    "Face the camera directly. Shoulders and hips must be visible.",
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Trainer() {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const poseRef     = useRef(null);
  const cameraRef   = useRef(null);
  const stageRef    = useRef("UP");
  const repsRef     = useRef(0);
  const exerciseRef = useRef("squat");

  const [exercise,      setExercise]      = useState("squat");
  const [isActive,      setIsActive]      = useState(false);
  const [reps,          setReps]          = useState(0);
  const [feedback,      setFeedback]      = useState("Press Start Camera to begin");
  const [angle,         setAngle]         = useState(180);
  const [postureScore,  setPostureScore]  = useState(null);
  const [postureIssues, setPostureIssues] = useState([]);

  const logRep = useCallback(async (newReps) => {
    try {
      await axios.post(`${API}/log-rep`, {
        reps:     newReps,
        exercise: exerciseRef.current,
        username: USERNAME,
      });
    } catch (e) {
      console.error("Failed to log rep:", e);
    }
  }, []);
  const uploadSnapshotToCloudinary = async () => {
  try {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    // Convert canvas to blob
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );

    if (!blob) return null;

    const formData = new FormData();
    formData.append("file", blob);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );

    console.log("✅ Snapshot uploaded:", response.data.secure_url);
    return response.data.secure_url;
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);
    return null;
  }
  };
  const startCamera = useCallback(() => {
    const Pose   = window.Pose;
    const Camera = window.Camera;

    if (!Pose || !Camera) {
      alert("MediaPipe still loading — wait 5 seconds and try again.");
      return;
    }

    const pose = new Pose({
      locateFile: (f) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}`,
    });

    pose.setOptions({
      modelComplexity:        1,
      smoothLandmarks:        true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence:  0.5,
    });

    pose.onResults((results) => {
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video) return;

      const W = video.videoWidth  || 640;
      const H = video.videoHeight || 480;
      canvas.width  = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(results.image, 0, 0, W, H);

      if (!results.poseLandmarks) {
        setFeedback("No pose detected — step back so full body is visible");
        return;
      }

      const lm = results.poseLandmarks;
      const ex = exerciseRef.current;

      if (ex === "squat") {
        const r = analyseSquat(lm, W, H, stageRef.current);
        stageRef.current = r.stage;
        if (r.counted) {
          repsRef.current += 1;
          setReps(repsRef.current);
          if (repsRef.current % 5 === 0) logRep(repsRef.current);
        }
        renderSquat(ctx, r.points, r.angle);
        setAngle(Math.round(r.angle));
        setFeedback(r.feedback);

      } else if (ex === "left_curl" || ex === "right_curl") {
        const side = ex === "left_curl" ? "left" : "right";
        const r    = analyseCurl(lm, W, H, stageRef.current, side);
        stageRef.current = r.stage;
        if (r.counted) {
          repsRef.current += 1;
          setReps(repsRef.current);
          if (repsRef.current % 5 === 0) logRep(repsRef.current);
        }
        renderCurl(ctx, r.points, r.angle);
        setAngle(Math.round(r.angle));
        setFeedback(r.feedback);

      } else if (ex === "posture") {
        const r = analysePosture(lm, W, H);
        renderPosture(ctx, r.points, r.score);
        setPostureScore(r.score);
        setPostureIssues(r.issues);
        setFeedback(r.feedback);
      }
    });

    poseRef.current = pose;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (poseRef.current) await poseRef.current.send({ image: videoRef.current });
      },
      width: 640, height: 480,
    });
    cameraRef.current = camera;
    camera.start();
    setIsActive(true);
    setFeedback("Camera started — get into position");
  }, [logRep]);

const stopCamera = async () => {
  // Upload current workout frame before stopping
  const imageUrl = await uploadSnapshotToCloudinary();

  if (imageUrl) {
    console.log("📸 Workout image saved:", imageUrl);

    // OPTIONAL: send image URL to backend later if needed
    // await axios.post(`${API}/save-image`, {
    //   username: USERNAME,
    //   image_url: imageUrl,
    //   exercise: exerciseRef.current,
    // });
  }

  cameraRef.current?.stop();
  cameraRef.current = null;
  poseRef.current?.close();
  poseRef.current = null;
  setIsActive(false);
  setFeedback("Camera stopped");
  const ctx = canvasRef.current?.getContext("2d");
  if (ctx) ctx.clearRect(0, 0, 640, 480);
  };

  const changeExercise = (ex) => {
    setExercise(ex);
    exerciseRef.current = ex;
    repsRef.current  = 0;
    stageRef.current = ex === "squat" ? "UP" : "DOWN";
    setReps(0);
    setAngle(180);
    setPostureScore(null);
    setPostureIssues([]);
    setFeedback("Exercise changed — get into position");
  };

  const isPosture  = exercise === "posture";
  const scoreColor = postureScore >= 80 ? "#16a34a" : postureScore >= 60 ? "#d97706" : "#dc2626";
  const scoreBg    = postureScore >= 80 ? "#f0fdf4" : postureScore >= 60 ? "#fffbeb" : "#fef2f2";

  return (
    <div style={{ padding: 24, maxWidth: 740, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>AI Gym Trainer</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
        Real-time rep counting • form feedback • posture analysis — {USERNAME}
      </p>

      {/* Exercise tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {EXERCISES.map((ex) => (
          <button key={ex.id} onClick={() => changeExercise(ex.id)} style={{
            padding: "8px 18px", borderRadius: 20, cursor: "pointer",
            border: "2px solid",
            borderColor: exercise === ex.id ? "#7c3aed" : "#e5e7eb",
            background:  exercise === ex.id ? "#7c3aed" : "#f9fafb",
            color:       exercise === ex.id ? "#fff"    : "#374151",
            fontWeight:  exercise === ex.id ? 600 : 400, fontSize: 14,
          }}>
            {ex.icon} {ex.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button onClick={isActive ? stopCamera : startCamera} style={{
          padding: "9px 22px", borderRadius: 8, border: "none",
          background: isActive ? "#ef4444" : "#7c3aed",
          color: "#fff", fontWeight: 500, fontSize: 14, cursor: "pointer",
        }}>
          {isActive ? "Stop Camera" : "Start Camera"}
        </button>
        {!isPosture && (
          <button onClick={() => {
            repsRef.current  = 0;
            stageRef.current = exercise === "squat" ? "UP" : "DOWN";
            setReps(0); setAngle(180);
          }} style={{
            padding: "9px 22px", borderRadius: 8,
            border: "1px solid #d1d5db", background: "#f3f4f6",
            fontWeight: 500, fontSize: 14, cursor: "pointer",
          }}>
            Reset
          </button>
        )}
      </div>

      {/* Canvas */}
      <div style={{
        position: "relative", borderRadius: 12, overflow: "hidden",
        border: "2px solid #e5e7eb", marginBottom: 20, background: "#111",
      }}>
        <video ref={videoRef} style={{ display: "none" }} />
        <canvas ref={canvasRef} width={640} height={480}
          style={{ width: "100%", display: "block" }} />
        {!isActive && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "#111", color: "#9ca3af", gap: 10,
          }}>
            <span style={{ fontSize: 48 }}>
              {EXERCISES.find((e) => e.id === exercise)?.icon}
            </span>
            <span style={{ fontSize: 15 }}>
              {exercise === "posture" ? "Stand facing the camera"
               : exercise === "squat" ? "Stand so full body is visible"
               : "Show your arm — press Start Camera"}
            </span>
          </div>
        )}
      </div>

      {/* Rep stats */}
      {!isPosture && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "18px 14px", textAlign: "center" }}>
            <p style={{ fontSize: 52, fontWeight: 700, color: "#7c3aed", margin: 0, lineHeight: 1 }}>{reps}</p>
            <p style={{ color: "#6d28d9", margin: "6px 0 0", fontSize: 14 }}>Reps</p>
          </div>
          <div style={{ background: "#eff6ff", borderRadius: 12, padding: "18px 14px", textAlign: "center" }}>
            <p style={{ fontSize: 52, fontWeight: 700, color: "#2563eb", margin: 0, lineHeight: 1 }}>{Math.floor(reps / 10)}</p>
            <p style={{ color: "#1d4ed8", margin: "6px 0 0", fontSize: 14 }}>Sets (10 reps)</p>
          </div>
          <div style={{ background: "#fff7ed", borderRadius: 12, padding: "18px 14px", textAlign: "center",
            display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#c2410c", margin: 0 }}>{angle}°</p>
            <p style={{ fontSize: 13, color: "#c2410c", margin: "4px 0 0" }}>{feedback}</p>
          </div>
        </div>
      )}

      {/* Posture stats */}
      {isPosture && postureScore !== null && (
        <div>
          <div style={{
            background: scoreBg, borderRadius: 12, padding: 20, marginBottom: 12,
            display: "flex", alignItems: "center", gap: 20,
          }}>
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <p style={{ fontSize: 52, fontWeight: 700, color: scoreColor, margin: 0, lineHeight: 1 }}>{postureScore}</p>
              <p style={{ color: scoreColor, margin: "4px 0 0", fontSize: 13, fontWeight: 500 }}>/ 100</p>
            </div>
            <div>
              <p style={{ fontWeight: 600, color: scoreColor, margin: "0 0 4px", fontSize: 16 }}>{feedback}</p>
              <p style={{ color: "#6b7280", margin: 0, fontSize: 13 }}>Live — updates every frame</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {postureIssues.map((issue, i) => (
              <div key={i} style={{
                padding: "10px 14px", borderRadius: 8, fontSize: 14,
                background: issue.includes("passed") ? "#f0fdf4" : "#fef9c3",
                color:      issue.includes("passed") ? "#15803d" : "#854d0e",
                border:     `1px solid ${issue.includes("passed") ? "#bbf7d0" : "#fde68a"}`,
              }}>
                {issue.includes("passed") ? "✓ " : "⚠ "}{issue}
              </div>
            ))}
          </div>
        </div>
      )}

      {isPosture && postureScore === null && isActive && (
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
          Stand facing the camera — posture score will appear here
        </p>
      )}

      {/* Tip */}
      <div style={{
        marginTop: 16, padding: "11px 16px", borderRadius: 8,
        background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 13, color: "#64748b",
      }}>
        <strong>Tip:</strong> {TIPS[exercise]}
      </div>
    </div>
  );
}