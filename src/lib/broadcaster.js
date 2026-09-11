// Director mode: composites the whole call (local + remote streams) into one
// 720p30 canvas + mixed audio, encodes it with MediaRecorder (webm/VP8+Opus),
// and pushes 2s chunks over a WebSocket to drover's /ingest/<key> endpoint —
// browsers can't speak RTMP, so this is the WebRTC→ABR-broadcast bridge.
// Drover pipes the bytes into ffmpeg stdin and fans out the HLS ladder.
//
// One participant (the "director") runs this; their upload is a single
// encoded stream (~2.5 Mbps) regardless of viewer count. Known tradeoff,
// documented in the masterplan: the director's tab/network is a single point
// of failure for the broadcast (fixed later by server-side compositing).

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const TIMESLICE_MS = 2000; // MediaRecorder chunk size — drover expects a chunked byte stream
const VIDEO_BPS = 2_500_000;

function pickMimeType() {
  const candidates = ["video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}

export default class Broadcaster {
  /**
   * @param {string} wsUrl    ws(s)://…/ingest/<streamKey>
   * @param {function} onStateChange  called with "connecting" | "live" | "idle" | "error"
   */
  constructor(wsUrl, onStateChange) {
    this.wsUrl = wsUrl;
    this.onStateChange = onStateChange || (() => {});
    this.videos = new Map(); // participantKey -> <video> playing that stream
    this.audioSources = new Map(); // participantKey -> MediaStreamAudioSourceNode
    this.state = "idle";
  }

  _setState(state) {
    this.state = state;
    this.onStateChange(state);
  }

  /** streams: [{ id, stream }] — local first, then remotes. */
  start(streams) {
    if (this.state !== "idle") return;
    this._setState("connecting");

    this.canvas = document.createElement("canvas");
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d");

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.audioDest = this.audioCtx.createMediaStreamDestination();

    this.setStreams(streams);

    // setInterval over requestAnimationFrame: rAF stops when the tab is
    // hidden, which would freeze the broadcast the moment the director
    // switches tabs. setInterval degrades to ~1fps in background tabs —
    // not great, but alive.
    this.drawTimer = setInterval(() => this._draw(), Math.round(1000 / FPS));

    const output = new MediaStream([
      ...this.canvas.captureStream(FPS).getVideoTracks(),
      ...this.audioDest.stream.getAudioTracks(),
    ]);

    this.ws = new WebSocket(this.wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.recorder = new MediaRecorder(output, {
        mimeType: pickMimeType(),
        videoBitsPerSecond: VIDEO_BPS,
      });
      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(e.data);
        }
      };
      this.recorder.start(TIMESLICE_MS);
      this._setState("live");
    };

    // Covers rejection (401/409 → socket never opens) and mid-broadcast drops.
    this.ws.onerror = () => this._teardown("error");
    this.ws.onclose = () => {
      if (this.state === "live" || this.state === "connecting") this._teardown("error");
    };
  }

  /** Update participants mid-broadcast (peers joining/leaving the call). */
  setStreams(streams) {
    if (!this.audioCtx) return;
    const nextKeys = new Set(streams.map((s) => s.id));

    // Remove departed participants from canvas + audio graph.
    for (const [key, video] of this.videos) {
      if (!nextKeys.has(key)) {
        video.srcObject = null;
        this.videos.delete(key);
      }
    }
    for (const [key, src] of this.audioSources) {
      if (!nextKeys.has(key)) {
        try { src.disconnect(); } catch {}
        this.audioSources.delete(key);
      }
    }

    // Add new ones.
    for (const { id, stream, muted } of streams) {
      if (!this.videos.has(id)) {
        const video = document.createElement("video");
        video.muted = true; // never locally audible — audio goes through the mix only
        video.playsInline = true;
        video.autoplay = true;
        video.srcObject = stream;
        video.play().catch(() => {});
        this.videos.set(id, video);
      }
      if (!this.audioSources.has(id) && !muted && stream.getAudioTracks().length > 0) {
        const src = this.audioCtx.createMediaStreamSource(stream);
        src.connect(this.audioDest);
        this.audioSources.set(id, src);
      }
    }

    this.order = streams.map((s) => s.id);
  }

  _draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0d0f14";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const feeds = (this.order || []).map((k) => this.videos.get(k)).filter((v) => v && v.readyState >= 2);
    const n = feeds.length;
    if (n === 0) return;

    // Simple even grid: 1 → full frame, 2 → side-by-side, 3-4 → 2×2, etc.
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cellW = WIDTH / cols;
    const cellH = HEIGHT / rows;

    feeds.forEach((video, i) => {
      const x = (i % cols) * cellW;
      const y = Math.floor(i / cols) * cellH;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      // object-fit: cover — crop the source to the cell's aspect ratio.
      const scale = Math.max(cellW / vw, cellH / vh);
      const sw = cellW / scale;
      const sh = cellH / scale;
      ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, x, y, cellW, cellH);
    });
  }

  /** Graceful end: flush the recorder's last chunk, then close the socket. */
  stop() {
    if (this.state === "idle") return;
    const finish = () => this._teardown("idle");
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = finish;
      try { this.recorder.stop(); } catch { finish(); }
      // ondataavailable for the final chunk fires before onstop.
    } else {
      finish();
    }
  }

  _teardown(finalState) {
    clearInterval(this.drawTimer);
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = null;
      try { this.recorder.stop(); } catch {}
    }
    this.recorder = null;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        try { this.ws.close(1000, "broadcast ended"); } catch {}
      }
      this.ws = null;
    }
    for (const video of this.videos.values()) video.srcObject = null;
    this.videos.clear();
    for (const src of this.audioSources.values()) {
      try { src.disconnect(); } catch {}
    }
    this.audioSources.clear();
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this._setState(finalState);
  }
}
