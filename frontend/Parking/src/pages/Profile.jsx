import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../css/Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  // State thông tin cá nhân (Form 1)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");

  // State xe và lịch sử (Layout chia đôi)
  const [vehicles, setVehicles] = useState([]);
  const [selectedPlate, setSelectedPlate] = useState("");
  const [ticketHistory, setTicketHistory] = useState([]);
  const [parkingHistory, setParkingHistory] = useState([]);

  // State Đăng ký xe mới & OTP (Form 2)
  const [newPlate, setNewPlate] = useState("");
  const [vehicleType, setVehicleType] = useState("Motorbike");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [activeTab, setActiveTab] = useState("ticket"); // 'ticket' hoặc 'parking'

  const [message, setMessage] = useState("");
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [saving, setSaving] = useState(false);

  // KHỐI ĐỒNG BỘ ĐỐI SOÁT PAYOS VÀ TẢI PROFILE REALTIME
  useEffect(() => {
    if (!token) return;

    const handlePaymentAndFetchProfile = async () => {
      const queryParams = new URLSearchParams(location.search);
      const status = queryParams.get("status");
      const orderCode = queryParams.get("orderCode");

      if (status && orderCode) {
        try {
          console.log(
            `[PAYOS REDIRECT] Trạng thái đơn hàng nhận diện: ${status}`,
          );
          await axios.get(
            `http://134.209.210.226:3000/api/users/payos-webhook?status=${status}&orderCode=${orderCode}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          navigate("/profile", { replace: true });
        } catch (error) {
          console.error("Lỗi đối soát đơn hàng từ client:", error);
        }
      }

      try {
        const res = await axios.get(
          "http://134.209.210.226:3000/api/users/profile",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setFullName(res.data.full_name || "");
        setEmail(res.data.email || "");
        setPhone(res.data.phone || "");
        setRole(res.data.role || "Customer");
        setVehicles(res.data.vehicles || []);
        setTicketHistory(res.data.monthly_tickets || []);
        setParkingHistory(res.data.parking_history || []);

        if (
          res.data.vehicles &&
          res.data.vehicles.length > 0 &&
          !selectedPlate
        ) {
          setSelectedPlate(res.data.vehicles[0].plate_number);
        }
      } catch (error) {
        console.error("Lỗi tải thông tin cá nhân:", error);
      }
    };

    handlePaymentAndFetchProfile();
  }, [token, location.search, navigate]);

  // HÀM 1: LƯU THÔNG TIN CÁ NHÂN CƠ BẢN
  const handleSaveBasicInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    localStorage.setItem("userName", fullName);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userPhone", phone);

    try {
      await axios.put(
        "http://134.209.210.226:3000/api/users/update-profile",
        { full_name: fullName, email, phone },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setMessage("🎉 Cập nhật thông tin cá nhân thành công!");
      const resProfile = await axios.get(
        "http://134.209.210.226:3000/api/users/profile",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setVehicles(resProfile.data.vehicles || []);
    } catch (err) {
      setMessage(
        "Lỗi cập nhật: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setSaving(false);
    }
  };

  // 🌟 HÀM XỬ LÝ: TÁI TẠO LINK QR PAYOS MỚI KHI BẤM "HOÀN TẤT THANH TOÁN" KẾ CHỮ PENDING
  const handleRepayPendingTicket = async (ticketItem) => {
    try {
      setSaving(true);
      const cleanPlate = ticketItem.plate_number;
      const amountToPay = Number(ticketItem.pricePaid || ticketItem.price_paid);

      const description = `Thanh toan lai ${cleanPlate}`;

      // Gọi API tạo cổng thanh toán mới từ Backend
      const paymentResponse = await axios.post(
        "http://134.209.210.226:3000/api/users/payos-checkout",
        { amount: amountToPay, description },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const checkoutUrl = paymentResponse.data.paymentUrl;
      alert(
        "🔄 Đang tạo cổng QR thanh toán mới, hệ thống sẽ chuyển hướng ngay!",
      );

      // Chuyển hướng người dùng sang trang QR PayOS để quét mã
      window.location.href = checkoutUrl;
    } catch (error) {
      alert(
        "Lỗi khởi tạo thanh toán lại: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setSaving(false);
    }
  };

  // HÀM 2: GỬI OTP THÊM XE CHÍNH CHỦ
  const handleRequestOtp = async () => {
    if (!newPlate) {
      alert("Vui lòng nhập biển số xe trước khi nhấn lấy OTP!");
      return;
    }
    setLoadingOtp(true);
    try {
      const response = await axios.post(
        "http://134.209.210.226:3000/api/parking/send-history-otp",
        { plate: newPlate },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setOtpSent(true);
      alert(response.data.message || "✉️ Mã OTP đã được gửi thành công!");
    } catch (err) {
      alert(
        "Không thể thêm phương tiện: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setLoadingOtp(false);
    }
  };

  // HÀM 3: XÁC THỰC OTP THÊM XE MỚI
  const handleAddNewVehicle = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      alert("Vui lòng nhập mã OTP xác thực từ Email!");
      return;
    }
    setSaving(true);
    try {
      const response = await axios.post(
        "http://134.209.210.226:3000/api/parking/get-history",
        { plate: newPlate, otp: otpCode },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert(response.data.message || "🎉 Thêm xe thành công!");
      setNewPlate("");
      setOtpCode("");
      setOtpSent(false);

      const res = await axios.get(
        "http://134.209.210.226:3000/api/users/profile",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setVehicles(res.data.vehicles || []);
      setTicketHistory(res.data.monthly_tickets || []);
      setParkingHistory(res.data.parking_history || []);
      setSelectedPlate(newPlate);
    } catch (err) {
      alert(
        "Lỗi xác thực phương tiện: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredTicketHistory = ticketHistory.filter(
    (item) =>
      item.plate_number === selectedPlate || item.plate === selectedPlate,
  );
  const filteredParkingHistory = parkingHistory.filter(
    (item) =>
      item.plate === selectedPlate || item.plate_number === selectedPlate,
  );

  if (!token) {
    return (
      <div className="profile-container-empty">
        <div className="empty-card" style={{ margin: "10px" }}>
          <h2>Yêu cầu đăng nhập</h2>
          <button
            onClick={() => navigate("/signin")}
            style={{
              color: "#2563eb",
              borderRadius: "9999px",
              padding: "11px 22px",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-layout-container">
      <aside className="profile-left-sidebar">
        <div className="sidebar-user-header">
          <h3>{fullName || "Hồ sơ"}</h3>
          <span className="role-tag">{role}</span>
        </div>

        <form onSubmit={handleSaveBasicInfo} className="profile-basic-form">
          <div className="form-mini-group">
            <label>Họ và tên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="form-mini-group">
            <label>Địa chỉ Email</label>
            <input type="email" value={email} required disabled />
          </div>
          <div className="form-mini-group">
            <label>Số điện thoại</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="save-basic-info-btn"
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu thông tin cá nhân"}
          </button>
          {message && (
            <p
              style={{
                color: "#27ae60",
                fontSize: "12px",
                marginTop: "5px",
                fontWeight: "600",
              }}
            >
              {message}
            </p>
          )}
        </form>

        <hr
          className="sidebar-divider"
          style={{
            margin: "20px 0",
            border: "none",
            borderTop: "1px solid #e2e8f0",
          }}
        />

        <div className="vehicle-list-section">
          <h4>Xe của bạn ({vehicles.length})</h4>
          {vehicles.length > 0 ? (
            <div className="vehicle-plates-grid">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className={`plate-item-card ${selectedPlate === v.plate_number ? "active-plate" : ""}`}
                  onClick={() => setSelectedPlate(v.plate_number)}
                >
                  <div className="plate-icon"></div>
                  <div className="plate-number-text">{v.plate_number}</div>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="no-data-text"
              style={{ fontSize: "13px", color: "#95a5a6" }}
            >
              Bạn chưa có xe nào
            </p>
          )}
        </div>

        <div className="add-vehicle-otp-box">
          <h5>Thêm xe</h5>
          <div className="form-mini-group">
            <label>Biển số xe mới:</label>
            <input
              type="text"
              placeholder="Ví dụ: 60AB85540"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              disabled={otpSent}
            />
          </div>
          <div className="form-mini-group">
            <label>Phân loại xe:</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              disabled={otpSent}
            >
              <option value="Motorbike">Xe máy</option>
              <option value="Car">Ô tô</option>
            </select>
          </div>

          {!otpSent ? (
            <button
              type="button"
              className="otp-req-btn"
              onClick={handleRequestOtp}
              disabled={loadingOtp}
            >
              {loadingOtp ? "Đang gửi mã..." : "Gửi OTP"}
            </button>
          ) : (
            <form onSubmit={handleAddNewVehicle} className="otp-verify-form">
              <div className="form-mini-group">
                <label style={{ color: "#e74c3c", fontWeight: "bold" }}>
                  Nhập mã OTP:
                </label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="Mã số từ Email"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                />
              </div>
              <div
                className="otp-action-row"
                style={{ display: "flex", gap: "10px", marginTop: "10px" }}
              >
                <button
                  type="submit"
                  className="otp-submit-btn"
                  style={{ flex: 2 }}
                >
                  Xác nhận thêm
                </button>
                <button
                  type="button"
                  className="otp-cancel-btn"
                  style={{
                    flex: 1,
                    background: "#95a5a6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                  }}
                  onClick={() => setOtpSent(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>
      </aside>

      <main className="profile-right-content">
        <div className="selected-plate-banner">
          <span>Phương tiện đang xem:</span>
          <strong style={{ fontSize: "20px", letterSpacing: "1px" }}>
            {selectedPlate || "Chưa chọn xe"}
          </strong>
        </div>

        <div className="history-tabs-nav">
          <button
            className={`tab-link ${activeTab === "ticket" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("ticket")}
          >
            Lịch sử Vé Tháng
          </button>
          <button
            className={`tab-link ${activeTab === "parking" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("parking")}
          >
            Lịch sử gửi Lượt vào/ra
          </button>
        </div>

        <div className="tab-content-panel">
          {activeTab === "ticket" && (
            <div className="history-panel-card">
              {filteredTicketHistory.length > 0 ? (
                <table className="custom-history-table">
                  <thead>
                    <tr>
                      <th>Ngày kích hoạt</th>
                      <th>Hạn sử dụng</th>
                      <th>Cước phí</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTicketHistory.map((t, idx) => (
                      <tr key={idx}>
                        <td>
                          {t.registrationDate ||
                            t.registration_date ||
                            "Hệ thống"}
                        </td>
                        <td style={{ color: "#27ae60", fontWeight: "bold" }}>
                          {t.expiryDate || t.expiry_date}
                        </td>
                        <td>
                          {(t.pricePaid || t.price_paid)?.toLocaleString(
                            "vi-VN",
                          )}{" "}
                          VNĐ
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              className={`status-pill ${t.status?.toLowerCase()}`}
                            >
                              {t.status}
                            </span>

                            {t.status?.toLowerCase() === "pending" && (
                              <button
                                type="button"
                                onClick={() => handleRepayPendingTicket(t)}
                                style={{
                                  background: "#2ecc71",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                Hoàn tất thanh toán
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-history-alert">
                  xe này không có gói đăng ký vé tháng nào
                </div>
              )}
            </div>
          )}

          {activeTab === "parking" && (
            <div className="history-panel-card">
              {filteredParkingHistory.length > 0 ? (
                <table className="custom-history-table">
                  <thead>
                    <tr>
                      <th>Thời điểm vào</th>
                      <th>Thời điểm ra</th>
                      <th>Phí gửi xe</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParkingHistory.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.timeIn || p.time_in}</td>
                        <td>
                          {p.timeOut || p.time_out || (
                            <span className="in-garage-tag">
                              Đang ở trong bãi
                            </span>
                          )}
                        </td>
                        <td>
                          {p.totalAmount || p.total_amount
                            ? `${(p.totalAmount || p.total_amount).toLocaleString("vi-VN")} VNĐ`
                            : "0 VNĐ"}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${p.status?.toLowerCase()}`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-history-alert">
                  Biển số này chưa ghi nhận bãi đỗ xe.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
