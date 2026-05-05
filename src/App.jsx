import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/Topnav";
import PlaylistSection from "./components/PlaylistSection";
import Footer from "./components/Footer";
import PreviewBanner from "./components/PreviewBanner";
import NowPlaying from "./components/NowPlaying";
import "./song.css";
import Signup from "./components/Signup";
import Login from "./components/Login";
import "./components/NowPlaying.css";
import "./components/Signup.css";
import "./components/Login.css";
import Search from "./components/Search";
import "./components/Search.css";
import VoiceAssistant from "./components/VoiceAssistant";
import "./components/VoiceAssistant.css";

const App = () => {
  const [songIndex, setSongIndex] = useState(null);
   const [shuffle, setShuffle] = useState(false);   // ✅ added shuffle toggle
  const [repeat, setRepeat] = useState(false);
  const navigate = useNavigate();

  // ✅ Songs Data
  const popularAlbums = [
    { id: 1, title: "Game Changer", artist: "Naanaa Hyraanaa", img: "/assets/hq720.avif", songUrl: "/assets/audio/song1.mp3" },
    { id: 2, title: "Thandal", artist: "Hilesso Hilessa", img: "/assets/hq720 (1).avif", songUrl: "/assets/audio/song2.mp3" },
    { id: 3, title: "Radhe Shyam", artist: "Avaroo Verevaroo", img: "/assets/hq720 (2).avif", songUrl: "/assets/audio/song3.mp3" },
    { id: 4, title: "Hridayam", artist: "Dharshana....", img: "/assets/hq720 (8).avif", songUrl: "/assets/audio/song4.mp3" },
    { id: 5, title: "Potel", artist: "Nagiroo Nagiraroo", img: "/assets/hq720 (3).avif", songUrl: "/assets/audio/song5.mp3" },
  ];

  const trendingSongs = [
    { id: 6, title: "Madraskaaran", artist: "Kaadhal Sadugudu", img: "/assets/hq720 (9).avif", songUrl: "/assets/audio/song6.mp3" },
    { id: 7, title: "Barbarik", artist: "Neevalle", img: "/assets/hqdefault.avif", songUrl: "/assets/audio/song7.mp3" },
    { id: 8, title: "Jetty", artist: "Dooram Karigina", img: "/assets/hq720 (11).avif", songUrl: "/assets/audio/song8.mp3" },
    { id: 9, title: "Kanguva", artist: "Mannimpu", img: "/assets/hqdefault.jpg", songUrl: "/assets/audio/song9.mp3" },
    { id: 10, title: "Court", artist: "Premaloo.....", img: "/assets/hq720 7.avif", songUrl: "/assets/audio/song10.mp3" },
  ];

  const allSongs = [...popularAlbums, ...trendingSongs];

  // ✅ Play song
// ✅ Simplified playSong
const playSong = (song) => {
  const index = allSongs.findIndex((s) => s.id === song.id);
  if (index === -1) return;

  setSongIndex(index);
  navigate(`/now-playing/${song.id}`);  // just navigate
};
  return (
    <div className="app">
      <Sidebar />
      <div className="main-section">
        <TopNav />

        <Routes>
          {/* Home page with playlists */}
          <Route
            path="/"
            element={
              <>
                <PlaylistSection title="Popular Albums" songs={popularAlbums} onPlay={playSong} />
                <PlaylistSection title="Trending Songs" songs={trendingSongs} onPlay={playSong} />
                <PreviewBanner />
                <Footer />
              </>
            }
          />

          {/* Auth pages */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Search */}
          <Route
            path="/search"
            element={<Search allSongs={allSongs} onPlay={playSong} />}
          />

          {/* Now Playing Page (only :id needed) */}
          <Route
            path="/now-playing/:id"
            element={
              <NowPlaying
                allSongs={allSongs}
                songIndex={songIndex}
                setSongIndex={setSongIndex}
                 shuffle={shuffle}
              repeat={repeat}
              />
            }
          />
        </Routes>

        {/* Voice Assistant */}
  <VoiceAssistant
  allSongs={allSongs}
  onPlay={playSong}
  songIndex={songIndex}
  setSongIndex={setSongIndex}
  shuffle={shuffle}
  setShuffle={setShuffle}
  repeat={repeat}
  setRepeat={setRepeat}
/>


      </div>
    </div>
  );
};

export default App;
