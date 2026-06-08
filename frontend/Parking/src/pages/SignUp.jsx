import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/Auth.css";

export default function SignUp() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post("http://68.183.102.106:3000/api/auth/signup", {
        ...formData,
      });

      alert("Đăng ký tài khoản thành công!");
      navigate("/signin");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Lỗi đăng ký! Vui lòng kiểm tra lại hệ thống.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-heading">ĐĂNG KÝ HỆ THỐNG</h2>
        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-label">Họ tên:</label>
            <input
              type="text"
              name="full_name"
              className="auth-input"
              onChange={handleChange}
              placeholder="Nhập họ và tên..."
              required
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label">Email:</label>
            <input
              type="email"
              name="email"
              className="auth-input"
              onChange={handleChange}
              placeholder="example@gmail.com"
              required
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label">Mật khẩu:</label>
            <input
              type="password"
              name="password"
              className="auth-input"
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label">Số điện thoại:</label>
            <input
              type="text"
              name="phone"
              className="auth-input"
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "ĐANG TẠO TÀI KHOẢN..." : "ĐĂNG KÝ"}
          </button>
        </form>

        <p className="auth-footer">
          Đã có tài khoản?{" "}
          <a href="/signin" className="auth-link">
            Đăng nhập
          </a>
        </p>
      </div>
    </div>
  );
}
