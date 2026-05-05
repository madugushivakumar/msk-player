// src/components/Search.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./Search.css";

const Search = ({ allSongs, onPlay }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setQuery(value);

    if (value.trim() === "") {
      setResults([]);
      return;
    }

    const filtered = allSongs.filter(
      (song) =>
        song.title.toLowerCase().includes(value) ||
        song.artist.toLowerCase().includes(value)
    );

    setResults(filtered);
  };

  const handleSongClick = (song) => {
    onPlay(song); // ✅ Play selected song
    navigate(`/now-playing/${song.id}`); // ✅ Redirect to NowPlaying
  };

  return (
    <div className="search-page">
      {/* 🔍 Search Input with Glow */}
      <motion.div
        className="search-bar"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.input
          type="text"
          placeholder="🔍 Search for songs or artists..."
          value={query}
          onChange={handleSearch}
          autoFocus
          whileFocus={{ scale: 1.05, boxShadow: "0 0 20px #1db954" }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>

      {/* 🎶 Search Results with Animations */}
      <div className="search-results">
        <AnimatePresence>
          {query && results.length === 0 ? (
            <motion.p
              key="no-results"
              className="no-result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              No song found 😢
            </motion.p>
          ) : (
            results.map((song, index) => (
              <motion.div
                key={index}
                className="search-item"
                onClick={() => handleSongClick(song)}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "#222",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <motion.img
                  src={song.img}
                  alt={song.title}
                  className="song-img"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                />
                <div>
                  <h4>{song.title}</h4>
                  <p>{song.artist}</p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Search;
