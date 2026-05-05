// src/components/NowPlaying.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./NowPlaying.css";

/*
  Features included:
  - Full player + draggable Mini player
  - Animated album art + glow
  - Progress bar with seek + hover tooltip
  - Time display (current / duration)
  - Auto next/prev and navigation
  - Queue drawer with clickable items
  - Lyrics panel (expand/collapse)
  - Shuffle & Repeat modes
  - Volume control + mute
  - Keyboard shortcuts (space play/pause, left/right seek, M mute)
  - Visualizer using WebAudio Analyser (orb + neon glow + starfield)
  - Smooth transitions, glassmorphism, micro-animations
  - Tolerant to song fields: song.songUrl|url|src, song.img|cover|image
*/

// ---- SINGLETONS (persist across modules & StrictMode) ----
let globalAudio =
  typeof window !== "undefined" ? window.__GLOBAL_AUDIO__ || null : null;
let audioContext =
  typeof window !== "undefined" ? window.__AUDIO_CTX__ || null : null;
let analyserNode =
  typeof window !== "undefined" ? window.__ANALYSER__ || null : null;
let sourceNode =
  typeof window !== "undefined" ? window.__SRC_NODE__ || null : null;
const NowPlaying = ({ allSongs, songIndex, setSongIndex }) => {
  const { id } = useParams(); // can be index or song.id
  const navigate = useNavigate();
  const song = allSongs?.[songIndex];
  const src = song?.songUrl || song?.url || song?.src || "";
  const artwork = song?.img || song?.cover || song?.image || "";
  // UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [repeatMode, setRepeatMode] = useState("none"); // none | one | all
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  // draggable mini
  const [miniPos, setMiniPos] = useState({
    x: 20,
    y: typeof window !== "undefined" ? window.innerHeight - 140 : 400,
  });
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  });
  // visualizer
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  // ---- A) Boot the singletons exactly once ----
  useEffect(() => {
    // Audio element
    if (!globalAudio) {
      globalAudio = new Audio();
      globalAudio.crossOrigin = "anonymous";
      globalAudio.preload = "auto";
      globalAudio.volume = volume;
      if (typeof window !== "undefined") window.__GLOBAL_AUDIO__ = globalAudio;
    }
    // WebAudio
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (typeof window !== "undefined") window.__AUDIO_CTX__ = audioContext;
      } catch (e) {
        console.warn("WebAudio not available:", e.message);
      }
    }

    if (audioContext && !analyserNode) {
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256; // higher for smoother orb
      if (typeof window !== "undefined") window.__ANALYSER__ = analyserNode;
    }

    // IMPORTANT: createMediaElementSource can only be created ONCE per audio element
    if (audioContext && analyserNode && !sourceNode) {
      try {
        sourceNode = audioContext.createMediaElementSource(globalAudio);
        sourceNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
        if (typeof window !== "undefined") window.__SRC_NODE__ = sourceNode;
      } catch (e) {
        // some browsers / contexts may throw if already created; ignore
      }
    }

    // Keyboard shortcuts
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowRight") {
        seekBy(5);
      } else if (e.code === "ArrowLeft") {
        seekBy(-5);
      } else if (e.code === "KeyM") {
        toggleMute();
      }
    };
    const onWindowResize = () => {
      setMiniPos((p) => ({
        x: Math.min(p.x, window.innerWidth - 120),
        y: Math.min(p.y, window.innerHeight - 120),
      }));
      // also resize canvas to maintain crisp visuals
      resizeCanvasToDisplaySize();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onWindowResize);

    // ensure canvas initial size matches display
    resizeCanvasToDisplaySize();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onWindowResize);
      stopVisualizer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper to resize canvas
  function resizeCanvasToDisplaySize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // make square large enough for orb; use min(window dimension, 900)
    const size = Math.min(Math.max(window.innerWidth * 0.6, 400), 900);
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
  }

  // ---- B) Sync route param -> songIndex (supports both index and song.id) ----
  useEffect(() => {
    if (!allSongs?.length) return;
    if (typeof id === "undefined") return;

    // treat numeric strings as index, else lookup by song.id
    const asNum = Number(id);
    let idx =
      Number.isInteger(asNum) && asNum >= 0 && asNum < allSongs.length
        ? asNum
        : allSongs.findIndex((s) => String(s.id) === String(id));

    if (idx >= 0 && idx !== songIndex) {
      setSongIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, allSongs]);

  // ---- C) When song/src changes, (re)bind listeners & try to autoplay ----
  useEffect(() => {
    if (!song || !globalAudio) return;

    // 🔑 stop previous track completely
    globalAudio.pause();
    globalAudio.currentTime = 0;
    if (globalAudio.src !== src) {
      globalAudio.src = src;
      globalAudio.load();
    }
    globalAudio.volume = muted ? 0 : volume;
    const onLoadedMeta = () => setDuration(globalAudio.duration || 0);
    const onTime = () => {
      const ct = globalAudio.currentTime || 0;
      const dur = globalAudio.duration || 0;
      setCurrentTime(ct);
      setProgressPct(dur ? (ct / dur) * 100 : 0);
    };
    const onEnd = () => {
      if (repeatMode === "one") {
        globalAudio.currentTime = 0;
        globalAudio.play();
      } else {
        handleNext();
      }
    };
    globalAudio.addEventListener("loadedmetadata", onLoadedMeta);
    globalAudio.addEventListener("timeupdate", onTime);
    globalAudio.addEventListener("ended", onEnd);
    startVisualizer();
    // try autoplay (after stopping old one)
    globalAudio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
    return () => {
      globalAudio.removeEventListener("loadedmetadata", onLoadedMeta);
      globalAudio.removeEventListener("timeupdate", onTime);
      globalAudio.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songIndex, src, repeatMode, muted, volume]);
  // Visualizer loop (orb with rainbow glow + motion trails + starfield)
  function startVisualizer() {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // visualizer state (kept inside function so re-init per start if needed)
    let hue = 120;
    let smoothedBars = new Array(bufferLength).fill(0);
    let rotation = 0;
    let bassBoost = 0;
    let shake = 0;
    let zoom = 1;
    // STARFIELD setup
    const stars = [];
    const STAR_COUNT = Math.round(Math.min(200, (canvas.width * canvas.height) / 4000)); // scale with canvas
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.6 + 0.4,
        baseAlpha: Math.random() * 0.6 + 0.2,
        twinklePhase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.15 + 0.02,
      });
    }
    // clear any previous RAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      analyserNode.getByteFrequencyData(dataArray);
      // ✨ translucent overlay → motion blur trails (lower alpha = longer trails)
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      // Update and draw stars first (behind orb)
      // stars respond subtly to bass: brighten and speed when bass is stronger
      const bass = dataArray.slice(0, Math.min(30, dataArray.length)).reduce((a, b) => a + b, 0) / Math.min(30, dataArray.length);
      const starSpeedMultiplier = 1 + Math.min(1.5, Math.max(0, (bass - 80) / 80));
      for (let s of stars) {
        // twinkle
        s.twinklePhase += 0.02 + Math.random() * 0.01;
        const alpha = Math.max(0, Math.min(1, s.baseAlpha + Math.sin(s.twinklePhase) * 0.35 + (bass / 600)));
        // small drift, slightly outward from center to simulate depth on bass
        const dirX = (s.x - cx) / (canvas.width / 2);
        const dirY = (s.y - cy) / (canvas.height / 2);
        s.x += (dirX * 0.02 + (Math.random() - 0.5) * 0.3) * starSpeedMultiplier;
        s.y += (dirY * 0.02 + (Math.random() - 0.5) * 0.3) * starSpeedMultiplier;
        // wrap around edges
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;
        // draw star (radial gradient for glow)
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 6);
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(0.6, `rgba(150,200,255,${alpha * 0.25})`);
        grad.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // 🎵 get average energy for orb behavior
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      // 💥 bass-driven orb pulse
      if (bass > 120) {
        bassBoost = Math.min(40, bassBoost + 2.5);
      } else {
        bassBoost = Math.max(0, bassBoost - 1.5);
      }
      // 📳 shake on heavy bass
      if (bass > 180) {
        shake = 18;
      } else {
        shake = Math.max(0, shake - 1);
      }
      // 🔍 zoom effect
      if (bass > 100) {
        zoom = 1 + Math.min(0.35, bass / 450);
      } else {
        zoom += (1 - zoom) * 0.06;
      }
      // 🌈 rainbow hue shift on energetic parts
      if (avg > 100) {
        hue = (hue + 2) % 360;
      } else {
        hue = 120; // calm = green
      }
      rotation += 0.012; // orb rotation speed (adjustable)
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.15; // scale radius with canvas
      const dynamicRadius = baseRadius + bassBoost;
      const dx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      const dy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      ctx.save();
      ctx.translate(cx + dx, cy + dy);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
      // draw orb bars (circular)
      for (let i = 0; i < bufferLength; i++) {
        const angle = (i / bufferLength) * Math.PI * 2 + rotation;
        const targetHeight = dataArray[i] / 2;
        // smooth bar height (lerp)
        smoothedBars[i] = smoothedBars[i] + (targetHeight - smoothedBars[i]) * 0.18;
        const barLength = smoothedBars[i];
        // neon gradient per bar
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `hsl(${hue}, 100%, 60%)`);
        gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 100%, 35%)`);
        ctx.strokeStyle = gradient;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 22;
        ctx.lineWidth = Math.max(2, Math.min(6, canvas.width / 200));
        // Bar start + end points (circular)
        const x1 = cx + Math.cos(angle) * dynamicRadius;
        const y1 = cy + Math.sin(angle) * dynamicRadius;
        const x2 = cx + Math.cos(angle) * (dynamicRadius + barLength);
        const y2 = cy + Math.sin(angle) * (dynamicRadius + barLength);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    };
    // start loop
    rafRef.current = requestAnimationFrame(render);
  }
  function stopVisualizer() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }
  // controls
  function togglePlayPause() {
    if (!globalAudio) return;
    if (isPlaying) {
      globalAudio.pause();
      setIsPlaying(false);
    } else {
      if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }
      globalAudio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }
  function playCurrentSong() {
    if (!globalAudio) return;
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    globalAudio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }
  function seekTo(valueSeconds) {
    if (!globalAudio) return;
    const max = globalAudio.duration || 0;
    globalAudio.currentTime = Math.max(0, Math.min(valueSeconds, max));
    setCurrentTime(globalAudio.currentTime);
  }
  function handleSeekPct(pct) {
    if (!globalAudio || !globalAudio.duration) return;
    const t = (pct / 100) * globalAudio.duration;
    seekTo(t);
  }
  function seekBy(sec) {
    if (!globalAudio) return;
    seekTo((globalAudio.currentTime || 0) + sec);
  }
  function handleNext() {
    if (!allSongs || allSongs.length === 0) return;

    let nextIndex;
    if (isShuffling) {
      nextIndex = Math.floor(Math.random() * allSongs.length);
    } else {
      nextIndex = (songIndex + 1) % allSongs.length;
      if (
        nextIndex === 0 &&
        repeatMode === "none" &&
        songIndex === allSongs.length - 1
      ) {
        globalAudio.pause();
        setIsPlaying(false);
        return;
      }
    }
    setSongIndex(nextIndex);
    navigate(`/now-playing/${nextIndex}`);

    // small delay to ensure src is updated before play
    setTimeout(() => playCurrentSong(), 60);
  }
  function handlePrev() {
    if (!allSongs || allSongs.length === 0) return;
    const prevIndex = (songIndex - 1 + allSongs.length) % allSongs.length;
    setSongIndex(prevIndex);
    navigate(`/now-playing/${prevIndex}`);
    setTimeout(() => playCurrentSong(), 60);
  }
  function toggleRepeat() {
    setRepeatMode((r) => (r === "none" ? "one" : r === "one" ? "all" : "none"));
  }
  function toggleMute() {
    setMuted((m) => {
      const newVal = !m;
      if (globalAudio) globalAudio.volume = newVal ? 0 : volume;
      return newVal;
    });
  }
  function onVolumeChange(v) {
    setVolume(v);
    if (!muted && globalAudio) globalAudio.volume = v;
  }
  // Mini drag handlers (mouse + touch)
  function onMiniMouseDown(e) {
    e.preventDefault();
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.baseX = miniPos.x;
    dragRef.current.baseY = miniPos.y;
    window.addEventListener("mousemove", onMiniMouseMove);
    window.addEventListener("mouseup", onMiniMouseUp);
  }
  function onMiniMouseMove(e) {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const nextX = Math.min(
      Math.max(0, dragRef.current.baseX + dx),
      window.innerWidth - 140
    );
    const nextY = Math.min(
      Math.max(0, dragRef.current.baseY + dy),
      window.innerHeight - 80
    );
    setMiniPos({ x: nextX, y: nextY });
  }
  function onMiniMouseUp() {
    dragRef.current.dragging = false;
    window.removeEventListener("mousemove", onMiniMouseMove);
    window.removeEventListener("mouseup", onMiniMouseUp);
  }
  function onMiniTouchStart(e) {
    const t = e.touches[0];
    dragRef.current.dragging = true;
    dragRef.current.startX = t.clientX;
    dragRef.current.startY = t.clientY;
    dragRef.current.baseX = miniPos.x;
    dragRef.current.baseY = miniPos.y;
    window.addEventListener("touchmove", onMiniTouchMove, { passive: false });
    window.addEventListener("touchend", onMiniTouchEnd);
  }
  function onMiniTouchMove(e) {
    e.preventDefault();
    if (!dragRef.current.dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    const nextX = Math.min(
      Math.max(0, dragRef.current.baseX + dx),
      window.innerWidth - 140
    );
    const nextY = Math.min(
      Math.max(0, dragRef.current.baseY + dy),
      window.innerHeight - 80
    );
    setMiniPos({ x: nextX, y: nextY });
  }
  function onMiniTouchEnd() {
    dragRef.current.dragging = false;
    window.removeEventListener("touchmove", onMiniTouchMove);
    window.removeEventListener("touchend", onMiniTouchEnd);
  }
  // progress tooltip state
  const [seekHoverPct, setSeekHoverPct] = useState(null);
  return (
    <>
      <div className={`np-root ${isMini ? "mini-mode" : "full-mode"}`}>
        {/* Background blurred artwork */}
        <div className="np-bg">
         {artwork ? (
  <img src={artwork} alt={song?.title} />
) : (
  <div className="mini-thumb-fallback" />
)}

        </div>
        {/* Full player UI */}
        {!isMini && (
          <div className="np-panel">
            <header className="np-header">
              <div className="np-left">
                <button
                  className="icon-btn"
                  onClick={() => setIsMini(true)}
                  title="Switch to mini"
                >
                  🔽
                </button>
              </div>
              <div className="np-center">
                <h3 className="np-title">Now Playing</h3>
                <p className="np-sub">Enjoy the vibes ✨</p>
              </div>
              <div className="np-right">
                <button
                  className="icon-btn"
                  onClick={() => setIsQueueOpen((s) => !s)}
                  title="Toggle queue"
                >
                  📜
                </button>
                <button
                  className={`icon-btn ${isShuffling ? "active" : ""}`}
                  onClick={() => setIsShuffling((s) => !s)}
                  title="Shuffle"
                >
                  🔀
                </button>
                <button
                  className={`icon-btn ${repeatMode !== "none" ? "active" : ""}`}
                  onClick={toggleRepeat}
                  title="Repeat"
                >
                  🔁
                </button>
              </div>
            </header>
            <main className="np-body">
              <section className="np-leftcol">
                <div className={`album-wrap ${isPlaying ? "spin" : ""}`}>
                  <img src={artwork} alt={song?.title} className="album-art" />
                  <div className="album-glow" />
                </div>
                <div className="visualizer-canvas">
                  {/* bigger square canvas to support orb + starfield */}
                  <canvas ref={canvasRef} width={600} height={600} />
                </div>
              </section>
              <section className="np-centercol">
                <div className="song-meta">
                  <div className="marquee-wrap" title={song?.title}>
                    <div className="marquee-inner">
                      <span>{song?.title}</span>
                    </div>
                  </div>
                  <p className="artist">{song?.artist}</p>
                </div>
                <div
                  className="progress-block"
                  onMouseLeave={() => setSeekHoverPct(null)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(
                      0,
                      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
                    );
                    setSeekHoverPct(pct);
                  }}
                >
                  <span className="time small">{formatTime(currentTime)}</span>
                  <input
                    className="progress"
                    type="range"
                    min="0"
                    max="100"
                    value={progressPct || 0}
                    onChange={(e) => handleSeekPct(Number(e.target.value))}
                  />
                  <span className="time small">{formatTime(duration)}</span>
                  {/* tooltip */}
                  {seekHoverPct !== null && duration > 0 && (
                    <div
                      className="seek-tooltip"
                      style={{ left: `calc(${seekHoverPct}% - 28px)` }}
                    >
                      {formatTime((seekHoverPct / 100) * duration)}
                    </div>
                  )}
                </div>
                <div className="controls-row">
                  <button className="control-btn" onClick={handlePrev} title="Previous">
                    ⏮
                  </button>
                  <button
                    className={`control-btn play bounce neon ${
                      isPlaying ? "active" : ""
                    }`}
                    onClick={togglePlayPause} // ✅ correct: togglePlayPause
                    title="Play/Pause"
                  >
                    {isPlaying ? "⏸" : "▶️"}
                  </button>
                  <button className="control-btn" onClick={handleNext} title="Next">
                    ⏭
                  </button>
                </div>
                <div className="extras-row">
                  <div className="volume">
                    <button className="icon-btn" onClick={toggleMute} title="Mute">
                      {muted ? "🔇" : "🔊"}
                    </button>
                    <input
                      className="vol-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={muted ? 0 : volume}
                      onChange={(e) => onVolumeChange(Number(e.target.value))}
                    />
                  </div>
                  <div className="actions">
                    <button
                      className="text-btn"
                      onClick={() => setIsLyricsOpen((s) => !s)}
                    >
                      {isLyricsOpen ? "Hide Lyrics" : "Show Lyrics"}
                    </button>
                    <button
                      className="text-btn"
                      onClick={() => setIsQueueOpen((s) => !s)}
                    >
                      {isQueueOpen ? "Hide Queue" : "Show Queue"}
                    </button>
                  </div>
                </div>
              </section>
              <aside className="np-rightcol">
                <div className={`queue-drawer ${isQueueOpen ? "open" : ""}`}>
                  <h4>Up Next</h4>
                  <ul>
                    {allSongs?.map((s, i) => (
                      <li
                        key={i}
                        className={i === songIndex ? "active" : ""}
                        onClick={() => {
                          setSongIndex(i);
                          navigate(`/now-playing/${i}`); // use index consistently
                        }}
                      >
                        <div className="q-left">
                          <img src={s.img || s.cover || s.image || ""} alt={s.title} />
                        </div>
                        <div className="q-mid">
                          <div className="q-title">{s.title}</div>
                          <div className="q-artist">{s.artist}</div>
                        </div>
                        <div className="q-right">{i === songIndex ? "Playing" : ""}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </main>
            {/* Lyrics bottom drawer */}
            {isLyricsOpen && (
              <div className="lyrics-drawer">
                <div className="lyrics-header">
                  <h4>Lyrics</h4>
                  <span className="lyrics-sub">
                    Auto-scroll / synced lines can be added later
                  </span>
                </div>
                <div className="lyrics-body">
                  <pre>{song?.lyrics || "No lyrics available for this track."}</pre>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Mini draggable player */}
        {isMini && (
          <div
            className="mini-player"
            style={{ left: miniPos.x, top: miniPos.y }}
            onMouseDown={onMiniMouseDown}
            onTouchStart={onMiniTouchStart}
            role="button"
          >
            <div className="mini-left" onClick={() => setIsMini(false)}>
              <img src={artwork} alt={song?.title} />
            </div>
            <div className="mini-mid">
              <div className="mini-title">{song?.title}</div>
              <div className="mini-artist">{song?.artist}</div>
            </div>
            <div className="mini-right">
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
              >
                ⏮
              </button>
              <button
                className="control-btn small"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              >
                ⏭
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
// small utility
function formatTime(secs) {
  if (secs == null || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
export default NowPlaying;
