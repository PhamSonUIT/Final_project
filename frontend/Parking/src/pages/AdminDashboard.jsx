import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/AdminDashboard.css";

export default function AdminDashboard() {
  const token = localStorage.getItem("token");
  const [currentTab, setCurrentTab] = useState("revenue");

  const [revenueData, setRevenueData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [monthlyTickets, setMonthlyTickets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const baseApi = "https://phamson.xyz/api/admin";

        if (currentTab === "revenue") {
          const res = await axios.get(`${baseApi}/revenue/stats`, { headers });
          setRevenueData(res.data);
        } else if (currentTab === "employees") {
          const res = await axios.get(`${baseApi}/employees`, { headers });
          setEmployees(res.data);
        } else if (currentTab === "customers") {
          const res = await axios.get(`${baseApi}/customers`, { headers });
          setCustomers(res.data);
        } else if (currentTab === "monthly") {
          const res = await axios.get(`${baseApi}/vehicles/monthly`, {
            headers,
          });
          setMonthlyTickets(res.data);
        } else if (currentTab === "transactions") {
          const res = await axios.get(`${baseApi}/vehicles/transactions`, {
            headers,
          });
          setTransactions(res.data);
        }
      } catch (error) {
        console.error(error);
        alert(
          error.response?.data?.message ||
            "Phiên đăng nhập hết hạn hoặc lỗi kết nối!",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentTab, token]);

  return (
    <div className="admin-dashboard-layout">
      <aside className="admin-sidebar">
        <h3>Hệ Thống Admin</h3>
        <div className="admin-menu-list">
          <button
            className={`admin-menu-btn ${currentTab === "revenue" ? "active" : ""}`}
            onClick={() => setCurrentTab("revenue")}
          >
            Thống kê doanh thu
          </button>
          <button
            className={`admin-menu-btn ${currentTab === "employees" ? "active" : ""}`}
            onClick={() => setCurrentTab("employees")}
          >
            Danh sách nhân viên
          </button>
          <button
            className={`admin-menu-btn ${currentTab === "customers" ? "active" : ""}`}
            onClick={() => setCurrentTab("customers")}
          >
            Danh sách khách hàng
          </button>
          <button
            className={`admin-menu-btn ${currentTab === "monthly" ? "active" : ""}`}
            onClick={() => setCurrentTab("monthly")}
          >
            Quản lý Vé Tháng
          </button>
          <button
            className={`admin-menu-btn ${currentTab === "transactions" ? "active" : ""}`}
            onClick={() => setCurrentTab("transactions")}
          >
            Nhật ký xe lượt vào/ra
          </button>
        </div>
      </aside>

      <main className="admin-main-content">
        {loading && (
          <p style={{ color: "#3498db", fontWeight: "bold" }}>Đang tải</p>
        )}

        {!loading && currentTab === "revenue" && revenueData && (
          <div>
            <h2>Doanh Thu Bãi Xe</h2>
            <div className="revenue-cards-grid">
              <div className="revenue-card total">
                <h4>Tổng doanh thu toàn bãi</h4>
                <p>{revenueData.totalRevenue?.toLocaleString("vi-VN")} VNĐ</p>
              </div>
              <div className="revenue-card monthly">
                <h4>Doanh thu từ Vé Tháng</h4>
                <p>{revenueData.monthlyRevenue?.toLocaleString("vi-VN")} VNĐ</p>
              </div>
              <div className="revenue-card ticket">
                <h4>Doanh thu xe lượt vãng lai</h4>
                <p>{revenueData.ticketRevenue?.toLocaleString("vi-VN")} VNĐ</p>
              </div>
            </div>
            <div className="stats-summary-row">
              <div>
                Số vé tháng đang còn hạn:{" "}
                <strong>{revenueData.activeMonthlyTickets} vé</strong>
              </div>
              <div style={{ marginLeft: "30px" }}>
                Số xe hiện tại đang nằm trong bãi:{" "}
                <strong>{revenueData.currentInParking} xe</strong>
              </div>
            </div>
          </div>
        )}

        {!loading && currentTab === "employees" && (
          <div>
            <h2>Danh Sách Nhân Sự & Ban Quản Lý</h2>
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ và tên</th>
                    <th>Email liên hệ</th>
                    <th>Số điện thoại</th>
                    <th>Chức vụ (Role)</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td>#{emp.id}</td>
                      <td>
                        <strong>{emp.full_name}</strong>
                      </td>
                      <td>{emp.email}</td>
                      <td>{emp.phone || "---"}</td>
                      <td>
                        <span
                          style={{
                            background: "#e1f5fe",
                            color: "#0288d1",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          {emp.roles?.role_name}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && currentTab === "customers" && (
          <div>
            <h2>Danh Sách Khách Hàng Đăng Ký Tài Khoản</h2>
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Mã KH</th>
                    <th>Tên khách hàng</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Ngày tham gia</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((cust) => (
                    <tr key={cust.id}>
                      <td>#{cust.id}</td>
                      <td>
                        <strong>{cust.full_name}</strong>
                      </td>
                      <td>{cust.email}</td>
                      <td>{cust.phone || "---"}</td>
                      <td>
                        {cust.created_at
                          ? new Date(cust.created_at).toLocaleDateString(
                              "vi-VN",
                            )
                          : "---"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && currentTab === "monthly" && (
          <div>
            <h2>Danh Sách Toàn Bộ Phương Tiện Đăng Ký Vé Tháng</h2>
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Chủ sở hữu</th>
                    <th>Số điện thoại</th>
                    <th>Hạn sử dụng</th>
                    <th>Giá tiền paid</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ letterSpacing: "1px", fontWeight: "bold" }}>
                        {t.plateNumber}
                      </td>
                      <td>{t.ownerName}</td>
                      <td>{t.ownerPhone || "---"}</td>
                      <td style={{ color: "#27ae60", fontWeight: "600" }}>
                        {t.expiryDate}
                      </td>
                      <td>{t.pricePaid?.toLocaleString("vi-VN")} VNĐ</td>
                      <td>
                        <span
                          className={`status-badge ${t.status.toLowerCase()}`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && currentTab === "transactions" && (
          <div>
            <h2>Nhật Ký Giám Sát Lượt Quẹt Camera Vào / Ra Bãi</h2>
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Mã lượt</th>
                    <th>Biển số xe</th>
                    <th>Thời điểm vào</th>
                    <th>Thời điểm ra</th>
                    <th>Thành tiền lượt</th>
                    <th>Vị trí bãi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>#{tx.id}</td>
                      <td style={{ letterSpacing: "1px", fontWeight: "bold" }}>
                        {tx.plateNumber}
                      </td>
                      <td>{tx.timeIn}</td>
                      <td>
                        {tx.timeOut || (
                          <span
                            style={{
                              color: "#e67e22",
                              fontStyle: "italic",
                              fontWeight: "600",
                            }}
                          >
                            Đang đậu trong bãi
                          </span>
                        )}
                      </td>
                      <td>
                        {tx.totalAmount > 0
                          ? `${tx.totalAmount.toLocaleString("vi-VN")} VNĐ`
                          : "0 VNĐ"}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${tx.status.toLowerCase()}`}
                        >
                          {tx.status === "In" ? "Chưa ra" : "Đã rời bãi"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
