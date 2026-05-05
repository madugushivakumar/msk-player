// src/components/TopNav.jsx
import React from "react";
import { useNavigate } from "react-router-dom";



const TopNav = () => {
  const navigate = useNavigate();
  return (
    <div className="top-nav">
      <div className="prev-btn">
        <button onClick={() => navigate("/")}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <button onClick={() => navigate("/now-playing")}>
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div className="login-btn">
        <button className="sign-up" onClick={() => navigate("/signup")}>
          Sign Up
        </button>
        <button className="login" onClick={() => navigate("/login")}>
          Login
        </button>
      </div>
    </div>
  );
};

export default TopNav;
