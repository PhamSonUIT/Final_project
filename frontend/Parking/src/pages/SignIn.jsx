import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/Auth.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "http://134.209.210.226:3000/api/auth/signin",
        {
          email,
          password,
        },
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("userName", res.data.user.full_name);
      localStorage.setItem("userEmail", res.data.user.email || "");
      localStorage.setItem("userPhone", res.data.user.phone || "");

      alert(`Chào mừng ${res.data.user.full_name} quay trở lại!`);

      navigate("/");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Sai tài khoản hoặc mật khẩu hoặc Backend chưa khởi động!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-heading">ĐĂNG NHẬP</h2>
        <form onSubmit={handleLogin}>
          <div className="auth-form-group">
            <label className="auth-label">Email:</label>
            <input
              type="email"
              className="auth-input"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email tài khoản..."
              required
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label">Mật khẩu:</label>
            <input
              type="password"
              className="auth-input"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "ĐANG XÁC THỰC..." : "ĐĂNG NHẬP"}
          </button>
        </form>
        <p className="auth-footer">
          Chưa có tài khoản?{" "}
          <a href="/signup" className="auth-link">
            Đăng ký ngay
          </a>
        </p>
      </div>
    </div>
  );
}
