import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/PriceSettings.css";

export default function PriceSettings() {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  const [bikeHourly, setBikeHourly] = useState(5000);
  const [carHourly, setCarHourly] = useState(20000);
  const [bikeMonthly, setBikeMonthly] = useState(100000);
  const [carMonthly, setCarMonthly] = useState(1000000);
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBikeHourly(Number(localStorage.getItem("priceBikeHourly") || 5000));
    setCarHourly(Number(localStorage.getItem("priceCarHourly") || 20000));
    setBikeMonthly(Number(localStorage.getItem("priceBikeMonthly") || 100000));
    setCarMonthly(Number(localStorage.getItem("priceCarMonthly") || 1000000));
  }, []);

  const savePrices = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage("");

    try {
      await axios.put(
        "https://phamson.xyz/api/parking/update-price",
        {
          id: 1,
          base_price: parseFloat(bikeHourly),
          overtime_price: parseFloat(bikeHourly * 0.5),
          monthly_price: parseFloat(bikeMonthly)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.put(
        "https://phamson.xyz/api/parking/update-price",
        {
          id: 2,
          base_price: parseFloat(carHourly),
          overtime_price: parseFloat(carHourly * 0.5),
          monthly_price: parseFloat(carMonthly)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem("priceBikeHourly", bikeHourly);
      localStorage.setItem("priceCarHourly", carHourly);
      localStorage.setItem("priceBikeMonthly", bikeMonthly);
      localStorage.setItem("priceCarMonthly", carMonthly);

      setStatusMessage("Cập nhật bảng giá thành công!");
    } catch (err) {
      console.error(err);
      setStatusMessage("Lỗi hệ thống, không thể lưu giá mới.");
    } finally {
      setSaving(false);
    }
  };

  if (!token || !["Admin", "Employee"].includes(userRole)) {
    return (
      <div className="price-settings-page">
        <div className="price-settings-card">
          <h2>Không có quyền truy cập</h2>
          <p>
            Chỉ Quản trị viên và nhân viên mới có thể điều chỉnh giá gửi xe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="price-settings-page">
      <div className="price-settings-card">
        <div className="price-settings-header">
          <div>
            <h1>Điều chỉnh giá gửi xe</h1>
            <p>
              Quản trị viên và nhân viên có thể cập nhật giá vé lượt và vé tháng
              cho hệ thống.
            </p>
          </div>
        </div>

        <form onSubmit={savePrices} className="price-form">
          <div className="price-section">
            <h2>Giá vé lượt</h2>
            <div className="price-row">
              <label>Xe máy (VNĐ):</label>
              <input
                type="number"
                min="0"
                value={bikeHourly}
                onChange={(e) => setBikeHourly(e.target.value)}
              />
            </div>
            <div className="price-row">
              <label>Ô tô (VNĐ):</label>
              <input
                type="number"
                min="0"
                value={carHourly}
                onChange={(e) => setCarHourly(e.target.value)}
              />
            </div>
          </div>

          <div className="price-section">
            <h2>Giá vé tháng</h2>
            <div className="price-row">
              <label>Xe máy (VNĐ/Tháng):</label>
              <input
                type="number"
                min="0"
                value={bikeMonthly}
                onChange={(e) => setBikeMonthly(e.target.value)}
              />
            </div>
            <div className="price-row">
              <label>Ô tô (VNĐ/Tháng):</label>
              <input
                type="number"
                min="0"
                value={carMonthly}
                onChange={(e) => setCarMonthly(e.target.value)}
              />
            </div>
          </div>

          <div className="price-actions">
            <button
              type="submit"
              className="price-button primary"
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
          {statusMessage && <div className="price-status">{statusMessage}</div>}
        </form>
      </div>
    </div>
  );
}