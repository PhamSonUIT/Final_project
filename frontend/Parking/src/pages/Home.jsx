import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "../css/Home.module.css";
import axios from "axios";

import CameraComponent from "../pages/CameraComponent.jsx";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentProcessedRef = useRef(false);

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  const [carCount, setCarCount] = useState(0);
  const [bikeCount, setBikeCount] = useState(0);

  const [vehicleType, setVehicleType] = useState("Motorbike");
  const [hours, setHours] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchCurrentSlots = async () => {
      try {
        const res = await axios.get("https://phamson.xyz/api/parking/slots");

        setBikeCount(res.data.availableBikes);
        setCarCount(res.data.availableCars);
      } catch (err) {
        console.error("Không thể lấy số lượng slot trống:", err);
      }
    };

    fetchCurrentSlots();

    const interval = setInterval(fetchCurrentSlots, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    const code = searchParams.get("code");

    if (paymentProcessedRef.current) return;
    if (!status && !code) return;

    const pendingData = JSON.parse(sessionStorage.getItem("pending_ticket"));
    if (!pendingData) return;

    paymentProcessedRef.current = true;
    sessionStorage.removeItem("pending_ticket");

    if (status === "PAID" || status === "success" || code === "00") {
      const paymentPayload = { ...pendingData, isPayOS: true };
      axios
        .post("https://phamson.xyz/api/users/month-ticket", paymentPayload, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          alert(
            `Đăng ký Vé Tháng thành công sau khi thanh toán!\n` +
              `• Biển số: ${res.data.ticketDetails.plateNumber}\n` +
              `• Thời hạn: ${res.data.ticketDetails.durationMonths} Tháng\n` +
              `• Hạn dùng đến: ${res.data.ticketDetails.expiryDate}`,
          );
          navigate("/", { replace: true });
        })
        .catch((err) => {
          alert(
            "Lỗi kích hoạt vé tháng: " +
              (err.response?.data?.message || err.message),
          );
          navigate("/", { replace: true });
        });
    } else if (status === "cancel") {
      sessionStorage.removeItem("pending_ticket");
      alert("đã hủy lệnh giao dịch thanh toán PayOS.");
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate, token]);

  const handleCalculate = async () => {
    if (hours <= 0) {
      alert("Vui lòng nhập số giờ gửi hợp lệ!");
      return;
    }

    try {
      const res = await axios.post("https://phamson.xyz/api/users/checkPrice", {
        vehicleType: vehicleType,
        hours: Number(hours),
      });
      setTotal(res.data.estimatedPrice);
    } catch (err) {
      const basePrice = vehicleType === "Car" ? 20000 : 5000;
      const overtimePrice = vehicleType === "Car" ? 10000 : 2000;

      if (hours <= 4) {
        setTotal(basePrice);
      } else {
        setTotal(basePrice + (hours - 4) * overtimePrice);
      }
    }
  };

  return (
    <div className={styles.page}>
      {token && (userRole === "Admin" || userRole === "Employee") && (
        <section id="camera-section" className={styles.cameraSection}>
          <h2 className={styles.sectionTitle}>CAMERA VÀO / RA</h2>
          <CameraComponent
            setBikeCount={setBikeCount}
            setCarCount={setCarCount}
          />
        </section>
      )}

      <main className={styles.mainContent}>
        <section id="slots" className={styles.slotsSection}>
          <div className={`${styles.card} ${styles.successCard}`}>
            <p className={styles.cardLabel}>Xe máy còn trống</p>
            <span className={styles.cardValue}>{bikeCount}</span>
          </div>
          <div className={`${styles.card} ${styles.primaryCard}`}>
            <p className={styles.cardLabel}>Ô tô còn trống</p>
            <span className={styles.cardValue}>{carCount}</span>
          </div>
        </section>

        <section className={styles.infoSection}>
          <div id="prices" className={styles.infoCard}>
            <h3 className={styles.cardTitle}>📋 BẢNG GIÁ LƯỢT</h3>
            <ul className={styles.priceList}>
              <li>
                <strong>Xe máy:</strong> 5.000 VNĐ (4h đầu) - Phát sinh: 2.000
                VNĐ/h
              </li>
              <li>
                <strong>Ô tô:</strong> 20.000 VNĐ (4h đầu) - Phát sinh: 10.000
                VNĐ/h
              </li>
            </ul>
          </div>

          <div id="check" className={`${styles.infoCard} ${styles.formCard}`}>
            <h3 className={styles.cardTitle}>Tính tiền gửi xe</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Loại xe:</label>
              <select
                className={styles.select}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="Car">Ô tô</option>
                <option value="Motorbike">Xe máy</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Thời gian gửi dự kiến (Giờ):
              </label>
              <input
                type="number"
                className={styles.input}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                min="1"
              />
            </div>
            <button
              type="button"
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={handleCalculate}
            >
              Tính toán chi phí
            </button>
            <p className={styles.summaryText}>
              Tổng cộng: {total.toLocaleString("vi-VN")} VNĐ
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
