import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import "../css/MonthTicket.css";

export default function MonthlyTicket() {
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [duration, setDuration] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("PayOS");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [monthlyPrice, setMonthlyPrice] = useState(1000000);
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setPricesLoading(true);
        const response = await axios.post(
          "https://phamson.xyz/api/users/checkPrice",
          { vehicleType: vehicleType, hours: 1 },
        );
        if (response.data.monthlyPrice) {
          setMonthlyPrice(response.data.monthlyPrice);
        }
      } catch (err) {
        console.error("Lỗi lấy giá từ server:", err);
        setMonthlyPrice(vehicleType === "Car" ? 1000000 : 100000);
      } finally {
        setPricesLoading(false);
      }
    };
    fetchPrices();
  }, [vehicleType]);

  const totalPrice = useMemo(() => {
    const months = Number(duration) > 0 ? Number(duration) : 1;
    return monthlyPrice * months;
  }, [monthlyPrice, duration]);

  const handleRegister = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
      return;
    }

    const cleanPlate = plate.replace(/[\s\.\-]/g, "").toUpperCase();
    if (!cleanPlate) {
      alert("Vui lòng nhập biển số xe hợp lệ!");
      return;
    }

    setLoading(true);
    setStatusMessage("");

    try {
      await axios.post(
        "https://phamson.xyz/api/users/month-ticket",
        {
          plateNumber: cleanPlate,
          vehicleType: vehicleType,
          durationMonths: Number(duration),
          isPayOS: false,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (paymentMethod === "PayOS") {
        const typeLabel = vehicleType === "Car" ? "Oto" : "Bike";
        const description = `Ve thang ${duration}T ${typeLabel} ${cleanPlate}`;

        const paymentResponse = await axios.post(
          "https://phamson.xyz/api/users/payos-checkout",
          { amount: totalPrice, description },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const checkoutUrl = paymentResponse.data.paymentUrl;
        setPaymentUrl(checkoutUrl);
        setStatusMessage("Chuyển hướng sang cổng PayOS...");

        sessionStorage.setItem(
          "pending_ticket_info",
          JSON.stringify({
            plateNumber: cleanPlate,
            orderCode: paymentResponse.data.checkoutId,
          }),
        );

        window.location.href = checkoutUrl;
      }
    } catch (err) {
      alert(
        err.response?.data?.message || "Không thể khởi tạo cổng giao dịch.",
      );
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="ticket-container">
      <div className="ticket-card">
        <div className="ticket-header">
          <h2>Đăng Ký Vé Tháng Phương Tiện</h2>
        </div>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Biển số xe đăng ký:</label>
            <input
              type="text"
              className="form-input input-highlight"
              placeholder="Ví dụ: 60AB85540 hoặc 29HA00233"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>Loại phương tiện:</label>
            <select
              className="form-select"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              disabled={loading || pricesLoading}
            >
              <option value="Car">Ô tô (Car)</option>
              <option value="Motorbike">Xe máy (Motorbike)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Số tháng đăng ký gói:</label>
            <input
              type="number"
              min="1"
              className="form-input input-highlight"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="payment-panel">
            <h3>Phương Thức Thanh Toán</h3>
            <div className="form-group">
              <label>Cổng kết nối thanh toán:</label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
              >
                <option value="PayOS">
                  Cổng thanh toán trực tuyến PayOS (QR Ngân hàng)
                </option>
              </select>
            </div>

            <div className="payment-summary">
              <span>Tổng số tiền cần thanh toán:</span>
              <strong className="payment-amount">
                {pricesLoading
                  ? "Đang tính toán..."
                  : totalPrice.toLocaleString("vi-VN")}{" "}
                VNĐ
              </strong>
            </div>

            {statusMessage && (
              <p
                className="payment-status"
                style={{ color: "#d35400", fontWeight: "600" }}
              >
                {statusMessage}
              </p>
            )}
            {paymentUrl && (
              <a href={paymentUrl} className="payment-link">
                Nhấp vào đây nếu không tự chuyển hướng...
              </a>
            )}
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || pricesLoading}
          >
            {loading
              ? "Đang xử lý tạo hóa đơn..."
              : pricesLoading
                ? "Đang tải dữ liệu..."
                : "Thanh toán ngay qua PayOS"}
          </button>
        </form>
      </div>
    </div>
  );
}
