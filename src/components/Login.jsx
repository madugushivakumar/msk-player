import React, { useState } from "react";
import "./Login.css"; // Make sure your CSS includes the updated animations

const Login = () => {
  const [step, setStep] = useState("login"); // "login" | "verify"
  const [formData, setFormData] = useState({ email: "" });
  const [code, setCode] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle input changes for login form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle login submission
  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    if (!formData.email.trim()) {
      setError("⚠️ Please enter your email/username.");
      return;
    }
    setStep("verify");
  };

  // Handle 6-digit code input
  const handleCodeChange = (e, index) => {
    const val = e.target.value.slice(-1); // Only last character
    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput && nextInput.focus();
    }
  };

  // Handle code verification
  const handleVerify = () => {
    const enteredCode = code.join("");
    if (enteredCode.length < 6) {
      setError("⚠️ Please enter all 6 digits.");
      setSuccess("");
      return;
    }
    setError("");
    setSuccess("✅ Login successful! (Demo only)");
    console.log("Verified with code:", enteredCode);
  };

  return (
    <div className="login-container">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg"
        alt="Spotify Logo"
        className="logo"
      />

      {step === "login" && (
        <>
          <h2>Log in to Spotify</h2>

          <div className="social-buttons">
            <button className="google">Continue with Google</button>
            <button className="facebook">Continue with Facebook</button>
            <button className="apple">Continue with Apple</button>
            <button className="phone">Continue with Phone</button>
          </div>

          <hr />

          <form className="login-form" onSubmit={handleLogin}>
            <label>Email or username</label>
            <input
              type="text"
              name="email"
              placeholder="Email or username"
              value={formData.email}
              onChange={handleChange}
            />
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="continue">
              Continue
            </button>
          </form>

          <p className="alt-option">
            Don’t have an account? <a href="/signup">Sign up for Spotify</a>
          </p>
        </>
      )}

      {step === "verify" && (
        <>
          <h2>
            Enter the 6-digit code sent to{" "}
            <b>s******{formData.email.slice(-3)}</b>
          </h2>

          <div className="code-inputs">
            {code.map((digit, i) => (
              <input
                key={i}
                id={`code-${i}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleCodeChange(e, i)}
                className="code-box"
              />
            ))}
          </div>

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}

          <button className="resend-btn">Resend code</button>
          <button className="continue" onClick={handleVerify}>
            Log in
          </button>

          <p
            className="alt-option"
            onClick={() => {
              setStep("login");
              setError("");
              setSuccess("");
            }}
          >
            Log in with a password
          </p>
        </>
      )}
    </div>
  );
};

export default Login;
