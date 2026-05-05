import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";   // ✅ Import Link
import "./Sidebar.css";

const Sidebar = () => {
  const [isSticky, setIsSticky] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Close sticky when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSticky(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect Ctrl+K and Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSticky(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (event.key === "Escape") {
        setIsSticky(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* 🔥 Overlay when search is active */}
      {isSticky && <div className="overlay"></div>}

      <div className="sidebar">
        <div className="sidebar-nav">
          <div className="logo">
            <Link to="/">
              <img src="assets/spotify-logo1.webp" alt="Logo" />
            </Link>
          </div>

          <ul>
            <li>
              <Link to="/">
                <i className="fa-solid fa-house"></i>
                <span>Home</span>
              </Link>
            </li>

            <li ref={searchRef}>
              <Link
                to="/search"
                className={`search-link ${isSticky ? "sticky" : ""}`}
                onClick={() => {
                  setIsSticky(true);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
              >
                <i className="fa-sharp fa-solid fa-magnifying-glass"></i>
                <span>Search</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="sidebar-nav box2">
          <ul>
            <li>
              <Link to="/library">
                <i className="fa-solid fa-book"></i> Your Library
              </Link>
            </li>
            <li>
              <div className="sidebar-scroll">
                <div className="create-playlist">
                  <h4>Create your first playlist</h4>
                  <p>It’s easy, we’ll help you</p>
                  <button>Create Playlist</button>
                </div>
                <div className="create-playlist">
                  <h4>Let’s find some podcasts to follow</h4>
                  <p>We’ll keep you updated on new episodes</p>
                  <button>Browse Podcasts</button>
                </div>
              </div>
            </li>
          </ul>
          <div className="privacy">
            <ul>
              <li>
                <Link to="/legal">Legal</Link> 
                <Link to="/privacy">Safety & Privacy</Link> 
                <Link to="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/cookies">Cookies</Link> 
                <Link to="/about-ads">About Ads</Link> 
                <Link to="/accessibility">Accessibility</Link>
              </li>
              <li>
                <Link to="/cookies">Cookies</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="eng-btn">
          <button>English</button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
