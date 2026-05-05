// src/components/VoiceAssistant.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./VoiceAssistant.css";

const SpeechRecognition =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

export default function VoiceAssistant({
  allSongs = [],
  onPlay,
  songIndex = null,
  setSongIndex = () => {},
  shuffle,
  setShuffle,
  repeat,
  setRepeat,
}) {
  const navigate = useNavigate();

  // UI state
  const [isAvailable, setIsAvailable] = useState(Boolean(SpeechRecognition));
  const [awake, setAwake] = useState(false); // woke by "Hey Siri"
  const [listening, setListening] = useState(false); // true when command recognizer active
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [logs, setLogs] = useState([]); // telemetry: {cmd, conf, time}
  const [wakeMode, setWakeMode] = useState(false);
  // Refs
  const wakeRef = useRef(null); // wake-word recognizer
  const cmdRef = useRef(null); // command recognizer
  const restartTimerRef = useRef(null);

  // Speak helper
  const speak = (text) => {
    setLastResponse(text);
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("SpeechSynthesis error:", e);
    }
  };

  // Telemetry helper
  const addLog = (cmd, conf = 1) => {
    const entry = { cmd, conf, time: new Date().toLocaleTimeString() };
    setLogs((p) => [...p.slice(-199), entry]); // keep last 200
  };

  // Safe global audio accessor (NowPlaying uses window.__GLOBAL_AUDIO__)
  const getGlobalAudio = () => (typeof window !== "undefined" ? window.__GLOBAL_AUDIO__ || null : null);

  // Initialize recognizers (wake + command) once
  useEffect(() => {
    if (!SpeechRecognition) {
      setIsAvailable(false);
      console.warn("SpeechRecognition not supported in this browser.");
      return;
    }
    setIsAvailable(true);

    // WAKE recognizer: cheap, listens for "hey siri" and auto-restarts
    const Wake = new SpeechRecognition();
    Wake.continuous = true;
    Wake.interimResults = false;
    Wake.lang = "en-US";
    Wake.maxAlternatives = 1;

    Wake.onresult = (ev) => {
      try {
        const last = ev.results[ev.results.length - 1][0];
        const raw = (last && last.transcript) ? last.transcript.trim().toLowerCase() : "";
        const conf = last?.confidence ?? 1;
        if (!raw) return;
        // log wake detections too
        if (/\bhey siri\b|\bsiri\b/.test(raw)) {
          addLog(raw, conf);
          // wake up: start command recognizer
          setAwake(true);
          speak("Yes?");
          startCommandRecognizer(); // start the heavy recognizer
        }
      } catch (err) {
        console.warn("wake onresult err", err);
      }
    };

    Wake.onend = () => {
      // always restart wake recognizer
      try {
        setTimeout(() => Wake.start(), 200);
      } catch (e) {}
    };

    Wake.onerror = (e) => {
  if (e.error !== "aborted") {
    console.error("Wake recognizer error:", e);
  }
      // if permission denied, stop; user will see UI
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setIsAvailable(false);
        speak("Microphone permission denied. Enable mic to use Siri.");
        try { Wake.stop(); } catch {}
      }
    };

    // Start wake recognizer immediately (so "Hey Siri" works without pressing button)
    try { Wake.start(); } catch (e) { /* may throw if permission not yet granted */ }
    wakeRef.current = Wake;

    // COMMAND recognizer setup but not started now (start on wake or manual)
    const Cmd = new SpeechRecognition();
    Cmd.continuous = true;
    Cmd.interimResults = false;
    Cmd.lang = "en-US";
    Cmd.maxAlternatives = 1;

    Cmd.onresult = (ev) => {
      try {
        const last = ev.results[ev.results.length - 1][0];
        const raw = (last && last.transcript) ? last.transcript.trim() : "";
        const conf = last?.confidence ?? 1;
        if (!raw) return;
        setTranscript(raw);
        addLog(raw, conf);
        processCommand(raw, conf);
      } catch (err) {
        console.warn("cmd onresult err", err);
      }
    };

    Cmd.onend = () => {
      // keep command recognizer alive while listening mode is true (manual or just-woke)
      if (listening) {
        // small debounce to avoid race loops
        restartTimerRef.current = setTimeout(() => {
          try { Cmd.start(); } catch (e) {}
        }, 200);
      } else {
        // if not listening, stop and go back to wake-only mode
        setAwake(false);
        setListening(false);
      }
    };

    Cmd.onerror = (e) => {
      console.warn("Command recognizer error:", e);
      // handle not-allowed
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        speak("Microphone permission denied. Please allow microphone access.");
        setListening(false);
      }
    };

    cmdRef.current = Cmd;

    // cleanup on unmount
    return () => {
      clearTimeout(restartTimerRef.current);
      try {
        Wake.onresult = null;
        Wake.onend = null;
        Wake.onerror = null;
        Wake.stop();
      } catch (e) {}
      try {
        Cmd.onresult = null;
        Cmd.onend = null;
        Cmd.onerror = null;
        Cmd.stop();
      } catch (e) {}
      wakeRef.current = null;
      cmdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start command recognizer helper
  function startCommandRecognizer() {
    const Cmd = cmdRef.current;
    if (!Cmd) return;
    try {
      Cmd.start();
      setListening(true);
      // while command recognizer is running, pause the wake recognizer to avoid duplicate results
      try { wakeRef.current && wakeRef.current.stop(); } catch (e) {}
    } catch (e) {
      console.warn("Failed to start command recognizer:", e);
      setListening(false);
      setLastResponse("Unable to access microphone.");
    }
  }

  // Stop command recognizer and resume wake-only
  function stopCommandRecognizer() {
    const Cmd = cmdRef.current;
    if (!Cmd) return;
    try { Cmd.stop(); } catch (e) {}
    setListening(false);
    setAwake(false);
    setLastResponse("Stopped listening.");
    // restart wake recognizer (if available)
    try { wakeRef.current && wakeRef.current.start(); } catch (e) {}
  }

  // Toggle listening (manual mic button)
  function toggleListening() {
    if (!isAvailable) {
      speak("Speech recognition is not available in this browser.");
      return;
    }
    if (listening) {
      stopCommandRecognizer();
    } else {
      // manual start: stop wake, start command
      try { wakeRef.current && wakeRef.current.stop(); } catch (e) {}
      startCommandRecognizer();
    }
  }

  // Add an optional public method (not necessary) - omitted for simplicity

  // --- Command processing (parsing & actions) ---
  function processCommand(raw, confidence = 1) {
    if (!raw) return;
    const lower = raw.toLowerCase();
    const cleaned = lower.replace(/^(hey\s*)?siri[,!\s]*/i, "").trim();

    // If user said "stop listening" or "go to sleep", stop command recognizer and re-enable wake
    if (/\b(stop listening|go to sleep|sleep|wake later|stop siri)\b/.test(cleaned)) {
      stopCommandRecognizer();
      speak("Okay — I will wait for Hey Siri.");
      return;
    }

    // Playback: next
    if (/\b(play (the )?next|next song|skip)\b/.test(cleaned)) {
      doNext();
      return;
    }

    // Playback: previous
    if (/\b(previous|prev|play (the )?previous|go back)\b/.test(cleaned)) {
      doPrev();
      return;
    }

    // Pause / Stop
    if (/\b(pause|stop playback|stop music|hold on)\b/.test(cleaned)) {
      doPause();
      return;
    }

    // Resume
    if (/\b(resume|continue|play music|start|unpause)\b/.test(cleaned)) {
      doResume();
      return;
    }

    // Shuffle toggle if setter provided
    if (/\bshuffle\b/.test(cleaned) && typeof setShuffle === "function") {
      const next = !shuffle;
      setShuffle(next);
      speak(`Shuffle ${next ? "enabled" : "disabled"}.`);
      return;
    }

    // Repeat cycle if setter provided
    if (/\brepeat\b/.test(cleaned) && typeof setRepeat === "function") {
      const modes = ["none", "one", "all"];
      const cur = repeat || "none";
      const next = modes[(modes.indexOf(cur) + 1) % modes.length];
      setRepeat(next);
      speak(`Repeat set to ${next}.`);
      return;
    }

    // Volume up/down
    if (/\b(volume up|increase volume|raise volume)\b/.test(cleaned)) {
      changeVolumeBy(0.1);
      return;
    }
    if (/\b(volume down|decrease volume|lower volume)\b/.test(cleaned)) {
      changeVolumeBy(-0.1);
      return;
    }
    // Set volume to X percent
    const setVol = cleaned.match(/set volume to (\d{1,3})/);
    if (setVol) {
      let pct = Math.max(0, Math.min(100, Number(setVol[1])));
      setVolume(pct / 100);
      return;
    }

    // Mute/unmute
    if (/\b(mute|unmute)\b/.test(cleaned)) {
      if (/\bmute\b/.test(cleaned)) setMute(true);
      else setMute(false);
      return;
    }

    // Seek forward/backward
    const seekMatch = cleaned.match(/\b(seek|forward|back|rewind)\b.*?(\d{1,3})\s*(seconds|secs|s)?/);
    if (seekMatch) {
      const dirWord = seekMatch[1];
      const amt = Number(seekMatch[2] || 5);
      if (/\b(back|rewind)\b/.test(dirWord)) seekBy(-amt);
      else seekBy(amt);
      return;
    }

    // Navigation: home, search, library, now playing, login, signup
    if (/\b(home|main)\b/.test(cleaned) && /\b(go|open|show|take me)\b/.test(cleaned)) {
      navigate("/");
      speak("Going to home.");
      return;
    }
    if (/\b(search|find|lookup)\b/.test(cleaned) && /\b(go|open|show|take me)\b/.test(cleaned)) {
      navigate("/search");
      speak("Opening search.");
      return;
    }
        if (/\b(sign up|find|lookup)\b/.test(cleaned) && /\b(go|open|show|take me)\b/.test(cleaned)) {
      navigate("/sign up");
      speak("Opening sign up.");
      return;
    }
        if (/\b(login|find|lookup)\b/.test(cleaned) && /\b(go|open|show|take me)\b/.test(cleaned)) {
      navigate("/login");
      speak("Opening login.");
      return;
    }
    if (/\b(library|your library)\b/.test(cleaned) && /\b(go|open|show|take me)\b/.test(cleaned)) {
      navigate("/library");
      speak("Opening your library.");
      return;
    }
    if (/\b(now playing|player|now-playing)\b/.test(cleaned) && /\b(go|open|show|take me)\b/.test(cleaned)) {
      const idx = typeof songIndex === "number" && songIndex >= 0 ? songIndex : 0;
      const sid = allSongs?.[idx]?.id ?? idx;
      navigate(`/now-playing/${sid}`);
      speak("Opening the player.");
      return;
    }
    if (/\b(login|log in)\b/.test(cleaned)) {
      navigate("/login");
      speak("Opening login page.");
      return;
    }
    if (/\b(sign ?up|register)\b/.test(cleaned)) {
      navigate("/signup");
      speak("Opening sign up page.");
      return;
    }

    // Play by name: "play [song name]" or fallback to fuzzy match
    const playByName = cleaned.match(/play (?:the )?(?:song )?(.+)$/i);
    if (playByName && playByName[1]) {
      playSongByName(playByName[1].trim());
      return;
    }

    // "title by artist" pattern
    const byMatch = cleaned.match(/^(.+?) by (.+)$/i);
    if (byMatch) {
      playSongByTitleAndArtist(byMatch[1].trim(), byMatch[2].trim());
      return;
    }

    // Fallback: try to find a matching song by text
    if (cleaned.length > 2) {
      playSongByName(cleaned);
      return;
    }

    // If nothing matched:
    speak("Sorry, I didn't understand that. Try: play next, play [song name], pause, or go to search.");
  }

  // --- Playback actions (use onPlay + setSongIndex) ---
  function doPause() {
    const audio = getGlobalAudio();
    if (audio && !audio.paused) {
      audio.pause();
      speak("Paused playback.");
    } else {
      speak("Playback is already paused.");
    }
  }

  function doResume() {
    const audio = getGlobalAudio();
    if (audio) {
      audio.play().then(() => speak("Resuming playback.")).catch(() => speak("Could not resume automatically."));
    } else if (allSongs.length > 0) {
      const idx = typeof songIndex === "number" && songIndex >= 0 ? songIndex : 0;
      setSongIndex(idx);
      onPlay && onPlay(allSongs[idx]);
      speak(`Playing ${allSongs[idx].title}.`);
    } else {
      speak("No songs available to play.");
    }
  }

  function doNext() {
    if (!allSongs || allSongs.length === 0) {
      speak("No songs in the queue.");
      return;
    }
    const idx = typeof songIndex === "number" ? songIndex : -1;
    const next = (idx + 1) % allSongs.length;
    setSongIndex(next);
    onPlay && onPlay(allSongs[next]);
    speak(`Playing next: ${allSongs[next].title} by ${allSongs[next].artist}`);
  }

  function doPrev() {
    if (!allSongs || allSongs.length === 0) {
      speak("No songs in the queue.");
      return;
    }
    const idx = typeof songIndex === "number" ? songIndex : 0;
    const prev = (idx - 1 + allSongs.length) % allSongs.length;
    setSongIndex(prev);
    onPlay && onPlay(allSongs[prev]);
    speak(`Playing previous: ${allSongs[prev].title} by ${allSongs[prev].artist}`);
  }

  function setMute(flag) {
    const audio = getGlobalAudio();
    if (audio) {
      audio.volume = flag ? 0 : Math.min(1, Math.max(0.05, audio.volume));
      speak(flag ? "Muted." : "Unmuted.");
    } else speak("No active audio to mute.");
  }

  function changeVolumeBy(delta) {
    const audio = getGlobalAudio();
    if (audio) {
      let v = Math.max(0, Math.min(1, audio.volume + delta));
      audio.volume = v;
      speak(`Volume ${(v * 100).toFixed(0)} percent.`);
    } else speak("No active audio to change volume.");
  }

  function setVolume(v) {
    const audio = getGlobalAudio();
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, v));
      speak(`Volume set to ${(audio.volume * 100).toFixed(0)} percent.`);
    } else speak("No active audio to set volume.");
  }

  function seekBy(sec) {
    const audio = getGlobalAudio();
    if (audio && audio.duration) {
      audio.currentTime = Math.max(0, Math.min(audio.duration, (audio.currentTime || 0) + sec));
      speak(`Seeked ${sec > 0 ? "forward" : "back"} ${Math.abs(sec)} seconds.`);
    } else speak("Unable to seek. No active playback.");
  }

  // --- Song search helpers ---
  function findSongByText(text) {
    if (!allSongs || allSongs.length === 0) return null;
    const t = text.toLowerCase();
    // title match
    let cand = allSongs.find((s) => (s.title || "").toLowerCase().includes(t));
    if (cand) return cand;
    // artist match
    cand = allSongs.find((s) => (s.artist || "").toLowerCase().includes(t));
    if (cand) return cand;
    // tokens matching
    const tokens = t.split(/\s+/).filter(Boolean);
    cand = allSongs.find((s) => {
      const hay = `${s.title} ${s.artist}`.toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    }) || null;
    return cand;
  }

  function playSongByName(name) {
    const song = findSongByText(name);
    if (song) {
      const idx = allSongs.findIndex((s) => s.id === song.id);
      if (idx >= 0) setSongIndex(idx);
      onPlay && onPlay(song);
      speak(`Playing ${song.title} by ${song.artist}.`);
    } else {
      speak(`I couldn't find a song matching "${name}".`);
    }
  }

  function playSongByTitleAndArtist(titleGuess, artistGuess) {
    const song =
      allSongs.find(
        (s) =>
          (s.title || "").toLowerCase().includes(titleGuess.toLowerCase()) &&
          (s.artist || "").toLowerCase().includes(artistGuess.toLowerCase())
      ) || null;
    if (song) {
      const idx = allSongs.findIndex((s) => s.id === song.id);
      if (idx >= 0) setSongIndex(idx);
      onPlay && onPlay(song);
      speak(`Playing ${song.title} by ${song.artist}.`);
    } else {
      speak(`Couldn't find ${titleGuess} by ${artistGuess}.`);
    }
  }

  // Render
  return (
    <div className="va-root" aria-live="polite">
      <div className={`va-panel ${listening ? "listening" : ""}`}>

        {/* Top: title + mic toggle */}
        <div className="va-top">
          <div className="va-title">
            <strong>Siri</strong>
            <span className="va-sub">Your voice assistant</span>
          </div>

          <button
            className="va-mic-btn"
            onClick={toggleListening}
            title={listening ? "Stop listening" : "Start listening"}
            aria-pressed={listening}
          >
            {listening ? "🎤" : "🎙️"}
          </button>
           <div className="va-sub">
              {wakeMode ? "Say 'Hey Siri' (or toggle Wake)" : listening ? "Listening for commands…" : "Ready"}
            </div>
        </div>

        {/* Body: wave + transcript + response */}
        <div className="va-body">
          <div className="va-wave" aria-hidden>
            {listening ? <div className="va-wave-anim" /> : <div className="va-wave-idle" />}
          </div>

          <div className="va-transcript" style={{ gridColumn: "2 / 3" }}>
            <div className="va-label">You said:</div>
            <div className="va-text">{transcript || "..."}</div>
          </div>

          <div className="va-response" style={{ gridColumn: "2 / 3", marginTop: 8 }}>
            <div className="va-label">Siri:</div>
            <div className="va-text">{lastResponse || (isAvailable ? "Ready" : "Speech recognition not supported")}</div>
          </div>
        </div>

        {/* Telemetry / logs */}
        <details className="va-log" style={{ marginTop: 10 }}>
          <summary style={{ color: "#9fe2a0", cursor: "pointer" }}>Command Logs ({logs.length})</summary>
          <div className="va-log-body" style={{ maxHeight: 160, overflow: "auto", marginTop: 8 }}>
            {logs.slice().reverse().map((l, i) => (
              <div key={i} className="va-log-entry" style={{ padding: "6px 4px", borderBottom: "1px dashed rgba(255,255,255,0.03)" }}>
                <span style={{ color: "#bfc6c2' " }}>[{l.time}]</span>{" "}
                <span style={{ marginLeft: 6 }}>{l.cmd}</span>{" "}
                <small style={{ color: "#9cc89b", marginLeft: 8 }}>({(l.conf * 100).toFixed(1)}%)</small>
              </div>
            ))}
          </div>
        </details>

      </div>
    </div>
  );
}
