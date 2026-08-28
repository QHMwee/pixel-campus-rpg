import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, QrCode, RefreshCw, X } from "lucide-react";
import QRCodeStyling from "qrcode";
import jsQR from "jsqr";
import {
  SyncChunkCollector,
  decodeSyncPayload,
  encodeSyncChunks,
  type SyncCollectorState,
} from "@shared/syncTransfer";

type SyncQrDialogProps = {
  /** 要傳送的整份資料。 */
  data: unknown;
  /** 接收端收齊並解碼成功後呼叫；由呼叫端決定如何寫入。 */
  onReceive: (data: Record<string, unknown>, exportedAt: string) => void;
  onClose: () => void;
};

type Mode = "send" | "receive";

/** 輪播間隔。太快手機來不及對焦，太慢整輪要等很久。 */
const FRAME_MS = 700;

export function SyncQrDialog({ data, onReceive, onClose }: SyncQrDialogProps) {
  const [mode, setMode] = useState<Mode>("send");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="pixel-panel-gold max-h-[90vh] w-full max-w-lg overflow-y-auto bg-[#16233f]">
        <div className="flex items-center justify-between border-b-2 border-[#5d719b] px-5 py-4">
          <div>
            <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">DEVICE SYNC</p>
            <h2 className="mt-1 text-lg font-black text-[#fff8df]">裝置間同步</h2>
          </div>
          <button onClick={onClose} aria-label="關閉" className="border-2 border-[#5d719b] p-1.5 text-[#c4d3e8] hover:border-[#f4c659] hover:text-[#f4c659]">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 border-b-2 border-[#40557c] px-5 py-3">
          {(["send", "receive"] as const).map(value => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex-1 border-2 px-3 py-2 text-xs font-black transition-colors ${
                mode === value
                  ? "border-[#f4c659] bg-[#4f4222] text-[#ffe796]"
                  : "border-[#526995] bg-[#172640] text-[#c4d3e8] hover:border-[#8ec6ff]"
              }`}
            >
              {value === "send" ? "這台傳出" : "這台接收"}
            </button>
          ))}
        </div>

        <div className="p-5">{mode === "send" ? <SendPanel data={data} /> : <ReceivePanel onReceive={onReceive} />}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SendPanel({ data }: { data: unknown }) {
  const [frames, setFrames] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const chunks = await encodeSyncChunks(data, crypto.randomUUID().slice(0, 8));
        if (!cancelled) setFrames(chunks);
      } catch {
        if (!cancelled) setError("無法產生同步碼。");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  // 輪播分段。只有一段時不需要動畫。
  useEffect(() => {
    if (frames.length <= 1) return;
    const timer = window.setInterval(() => setCurrent(value => (value + 1) % frames.length), FRAME_MS);
    return () => window.clearInterval(timer);
  }, [frames.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frames[current];
    if (!canvas || !frame) return;
    QRCodeStyling.toCanvas(canvas, frame, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "L",
      color: { dark: "#10182f", light: "#fff8df" },
    }).catch(() => setError("無法繪製 QR code。"));
  }, [frames, current]);

  if (error) return <p className="text-sm leading-6 text-[#ffb4b4]">{error}</p>;
  if (!frames.length) return <p className="text-sm leading-6 text-[#c4d3e8]">正在產生同步碼…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-[#c4d3e8]">
        在另一台裝置打開同一個網站，選「這台接收」，然後對準下方的 QR code。
        {frames.length > 1 && "畫面會自動輪播，請保持對準直到收齊。"}
      </p>

      <div className="flex justify-center">
        <div className="border-4 border-[#f4c659] bg-[#fff8df] p-2">
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-black text-[#f4c659]">
        <span>
          第 {current + 1} / {frames.length} 段
        </span>
        {frames.length > 1 && <span className="text-[#8ec6ff]">輪播中，不需要手動操作</span>}
      </div>

      {frames.length > 1 && (
        <div className="pixel-progress">
          <span style={{ width: `${((current + 1) / frames.length) * 100}%` }} />
        </div>
      )}

      <p className="border-l-4 border-[#74e2b1] bg-[#173c3a] px-3 py-2 text-xs leading-5 text-[#d6f7e6]">
        資料只透過鏡頭傳遞，不會經過網路或任何伺服器。
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ReceivePanel({ onReceive }: { onReceive: (data: Record<string, unknown>, exportedAt: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const collectorRef = useRef(new SyncChunkCollector());
  const doneRef = useRef(false);
  const [state, setState] = useState<SyncCollectorState>({ sessionId: null, total: 0, received: 0, missing: [], complete: false });
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const handleComplete = useCallback(async () => {
    const payload = collectorRef.current.assemble();
    if (!payload) return;
    const decoded = await decodeSyncPayload(payload);
    if (!decoded) {
      setError("收到的資料無法解讀，可能是掃描過程中有分段損壞。請重新開始。");
      collectorRef.current.reset();
      doneRef.current = false;
      return;
    }
    setFinished(true);
    onReceive(decoded.data, decoded.exportedAt);
  }, [onReceive]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setError("無法開啟相機。請確認已授權相機權限，且網址是 https。");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      const scan = () => {
        if (stopped || doneRef.current) return;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            const found = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
            if (found?.data) {
              const next = collectorRef.current.accept(found.data);
              setState(next);
              if (next.complete && !doneRef.current) {
                doneRef.current = true;
                void handleComplete();
              }
            }
          }
        }
        raf = requestAnimationFrame(scan);
      };
      raf = requestAnimationFrame(scan);
    }

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [handleComplete]);

  function restart() {
    collectorRef.current.reset();
    doneRef.current = false;
    setState({ sessionId: null, total: 0, received: 0, missing: [], complete: false });
    setError(null);
    setFinished(false);
  }

  if (finished) {
    return (
      <div className="space-y-3 text-center">
        <Check size={40} className="mx-auto text-[#74e2b1]" />
        <p className="text-sm font-black text-[#d5ffe7]">已接收完成並寫入這台裝置。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-[#c4d3e8]">
        把鏡頭對準另一台裝置畫面上的 QR code，保持對準直到進度滿為止。
      </p>

      <div className="relative overflow-hidden border-2 border-[#526995] bg-black">
        <video ref={videoRef} playsInline muted className="block max-h-64 w-full object-cover" />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 border-4 border-[#f4c659]/70" />
          </div>
        )}
      </div>

      {error ? (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[#ffb4b4]">{error}</p>
          <button onClick={restart} className="flex items-center gap-2 border-2 border-[#8ec6ff] bg-[#1e3458] px-3 py-2 text-xs font-black text-[#d3e2ff]">
            <RefreshCw size={14} /> 重新開始
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-[#f4c659]">
              {state.total ? `已收 ${state.received} / ${state.total} 段` : "尚未偵測到同步碼"}
            </span>
            {state.total > 0 && state.missing.length > 0 && (
              <span className="text-[#8ec6ff]">還缺第 {state.missing.slice(0, 6).map(i => i + 1).join("、")} 段</span>
            )}
          </div>
          {state.total > 0 && (
            <div className="pixel-progress">
              <span style={{ width: `${(state.received / state.total) * 100}%` }} />
            </div>
          )}
        </>
      )}

      <p className="border-l-4 border-[#f4c659] bg-[#3d3218] px-3 py-2 text-xs leading-5 text-[#ffe9b0]">
        接收會覆蓋這台裝置上現有的資料。建議先下載一份備份再進行。
      </p>
    </div>
  );
}

export default SyncQrDialog;
