// src/components/Signup.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Signup.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isStrong = (pwd) =>
  pwd.length >= 10 && /[A-Za-z]/.test(pwd) && (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd));

export default function Signup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    dobYear: "",
    dobMonth: "",
    dobDay: "",
    gender: "",
    marketing: false,
    shareData: false,
  });

  const navigate = useNavigate();

  const updateField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const validateStep = (s) => {
    if (s === 1) {
      if (!form.email) return "Please enter your email.";
      if (!EMAIL_RE.test(form.email)) return "Please enter a valid email.";
    }
    if (s === 2) {
      if (!form.password) return "Password is required.";
      if (!isStrong(form.password))
        return "Password must be at least 10 characters and include a letter and a number or symbol.";
      if (!form.confirmPassword) return "Please confirm your password.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    if (s === 3) {
      if (!form.firstName || !form.lastName) return "Please enter your first and last name.";
      // DoB (optional light check)
      if (form.dobYear && !/^\d{4}$/.test(form.dobYear)) return "Enter a valid year (YYYY).";
      if (form.dobDay && !(+form.dobDay >= 1 && +form.dobDay <= 31)) return "Enter a valid day (1–31).";
    }
    return "";
  };

  const handleNext = async () => {
    const msg = validateStep(step);
    if (msg) return setError(msg);
    setError("");
    if (step < 4) return setStep(step + 1);
    // submit on final step
    await handleSubmit();
  };

  const handleBack = () => {
    setError("");
    if (step > 1) setStep(step - 1);
  };

 const handleSubmit = async () => {
    try {
      setLoading(true);
      setTimeout(() => {
        alert("✅ Signup successful! (Demo only, no backend)");
        navigate("/login");
      }, 800); // small delay for "loading" effect
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg"
        alt="spotify-logo"
        className="logo"
      />
      <h2>Sign up to start listening</h2>

      {/* Error */}
      {error ? <p className="error-text">{error}</p> : null}

      {/* Progress */}
      <div className="progress">
        <div className={`progress-bar step-${step}`}></div>
      </div>

      {/* ===== STEP 1 ===== */}
      {step === 1 && (
        <>
          <h2>Step 1 of 4</h2>
          <h3>Enter your email address</h3>
          <input
            className={error && !EMAIL_RE.test(form.email) ? "input-error" : ""}
            type="email"
            placeholder="name@domain.com"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <p className="alt-option">
            <a href="#">Use phone number instead.</a>
          </p>

          <button className="next-btn" onClick={handleNext} disabled={loading}>
            Next
          </button>

          <div className="divider">
            <span></span>
            <p>or</p>
            <span></span>
          </div>

          <button className="social-btn google">Sign up with Google</button>
          <button className="social-btn apple">Sign up with Apple</button>

          <p className="login-footer">
            Already have an account? <a href="/login">Log in here.</a>
          </p>
        </>
      )}

      {/* ===== STEP 2 ===== */}
      {step === 2 && (
        <>
          <button className="back-btn" onClick={handleBack} disabled={loading}>
            ← Back
          </button>
          <h2>Step 2 of 4</h2>
          <h3>Create a password</h3>

          <div className="pwd-field">
            <input
              className={error && !isStrong(form.password) ? "input-error" : ""}
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
            />
            <button type="button" className="pwd-toggle" onClick={() => setShowPwd((v) => !v)}>
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>

          <div className="pwd-field">
            <input
              className={error && form.password !== form.confirmPassword ? "input-error" : ""}
              type={showConfirmPwd ? "text" : "password"}
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
            />
            <button
              type="button"
              className="pwd-toggle"
              onClick={() => setShowConfirmPwd((v) => !v)}
            >
              {showConfirmPwd ? "Hide" : "Show"}
            </button>
          </div>

          <ul className="password-rules">
            <li>✅ 1 letter</li>
            <li>✅ 1 number or special character</li>
            <li>✅ Minimum 10 characters</li>
          </ul>

          <button className="next-btn" onClick={handleNext} disabled={loading}>
            Next
          </button>
        </>
      )}

      {/* ===== STEP 3 ===== */}
      {step === 3 && (
        <>
          <button className="back-btn" onClick={handleBack} disabled={loading}>
            ← Back
          </button>
          <h2>Step 3 of 4</h2>
          <h3>Tell us about yourself</h3>

          <label>First Name</label>
          <input
            className={error && !form.firstName ? "input-error" : ""}
            type="text"
            placeholder="First Name"
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
          />

          <label>Last Name</label>
          <input
            className={error && !form.lastName ? "input-error" : ""}
            type="text"
            placeholder="Last Name"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
          />

          <label>Date of Birth</label>
          <div className="dob-group">
            <input
              type="text"
              placeholder="YYYY"
              value={form.dobYear}
              onChange={(e) => updateField("dobYear", e.target.value)}
            />
            <select
              value={form.dobMonth}
              onChange={(e) => updateField("dobMonth", e.target.value)}
            >
              <option value="">Month</option>
              {[
                "January","February","March","April","May","June",
                "July","August","September","October","November","December",
              ].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="DD"
              value={form.dobDay}
              onChange={(e) => updateField("dobDay", e.target.value)}
            />
          </div>

          <label>Gender</label>
          <div className="gender-options">
            {["Man", "Woman", "Non-binary", "Something else", "Prefer not to say"].map(
              (option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="gender"
                    value={option}
                    checked={form.gender === option}
                    onChange={(e) => updateField("gender", e.target.value)}
                  />
                  {option}
                </label>
              )
            )}
          </div>

          <button className="next-btn" onClick={handleNext} disabled={loading}>
            Next
          </button>
        </>
      )}

      {/* ===== STEP 4 ===== */}
      {step === 4 && (
        <>
          <button className="back-btn" onClick={handleBack} disabled={loading}>
            ← Back
          </button>
          <h2>Step 4 of 4</h2>
          <h3>Terms & Conditions</h3>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.marketing}
              onChange={(e) => updateField("marketing", e.target.checked)}
            />
            I would prefer not to receive marketing messages.
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.shareData}
              onChange={(e) => updateField("shareData", e.target.checked)}
            />
            Share my registration data with Spotify’s content providers.
          </label>

          <p className="terms-text">
            By clicking on sign-up, you agree to Spotify’s{" "}
            <a href="#">Terms and Conditions of Use</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </p>

          <button className="next-btn" onClick={handleNext} disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </>
      )}
    </div>
  );
}
