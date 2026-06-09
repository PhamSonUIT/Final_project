import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { io } from "socket.io-client";
import axios from "axios";
import "../css/Camera.css";

// Kết nối đến AI Service (Python) để lấy biển số xe real-time
const pythonSocket = io("http://134.209.210.226:5005", {
  transports: ["websocket"],
});

export default function CameraComponent(props) {
  const webcamRef = useRef(null);

  const [detectedPlate, setDetectedPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  const [selectedType, setSelectedType] = useState("Auto");

  // 🌟 KHẮC PHỤC ĐÓNG BĂNG STATE: Đồng bộ các dữ liệu camera mới nhất cho luồng tự động
  const currentDataRef = useRef({ detectedPlate, selectedType, detectedType });
  useEffect(() => {
    currentDataRef.current = { detectedPlate, selectedType, detectedType };
  }, [detectedPlate, selectedType, detectedType]);

  // 1. Nhận biển số từ Python AI liên tục (3 frames/giây)
  useEffect(() => {
    pythonSocket.on("detection_result", (data) => {
      if (data.plate !== "Đang tìm...") {
        setDetectedPlate(data.plate);
      }
    });

    const interval = setInterval(() => {
      const image = webcamRef.current?.getScreenshot();
      if (image) pythonSocket.emit("image_frame", image);
    }, 333);

    return () => {
      clearInterval(interval);
      pythonSocket.off("detection_result");
    };
  }, []);

  // 🌟 2. LUỒNG QUẸT THẺ TỰ ĐỘNG BẰNG ĐẦU ĐỌC USB RFID GÕ PHÍM KÈM ENTER
  useEffect(() => {
    let buffer = "";
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        if (buffer.trim().length > 0) {
          const finalRfidUid = buffer.trim().toUpperCase();
          console.log("🎯 Thiết bị USB quét thẻ:", finalRfidUid);

          handleConfirmWithUsbRfid(finalRfidUid);
          buffer = "";
        }
      } else {
        if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
          buffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Tự động nhận diện phân loại xe khi có biển số mới
  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem("token");
    if (!detectedPlate || detectedPlate === "---") {
      setDetectedType(null);
      setSelectedType("Auto");
      return;
    }

    const fetchType = async () => {
      try {
        const res = await axios.post(
          "http://134.209.210.226:3000/api/parking/detect-type",
          { plate: detectedPlate },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!mounted) return;
        setDetectedType(
          res.data.vehicleTypeName ||
            (res.data.vehicleTypeId === 1 ? "Motorbike" : "Car"),
        );
        setSelectedType("Auto");
      } catch (err) {
        console.warn("Không lấy được loại xe tự động:", err?.message || err);
        setDetectedType(null);
        setSelectedType("Auto");
      }
    };

    fetchType();
    return () => {
      mounted = false;
    };
  }, [detectedPlate]);

  const handleConfirmWithUsbRfid = async (rfidUid) => {
    const {
      detectedPlate: activePlate,
      selectedType: activeSelType,
      detectedType: activeDetType,
    } = currentDataRef.current;

    if (!activePlate || activePlate === "---") {
      console.warn("Bỏ qua giao dịch: Chưa bắt được biển số!");
      return;
    }

    setLoading(true);
    const screenshot = webcamRef.current.getScreenshot();
    const token = localStorage.getItem("token");

    try {
      const payload = {
        plate: activePlate,
        image: screenshot,
        rfid_uid: rfidUid,
      };

      if (activeSelType && activeSelType !== "Auto") {
        payload.overrideVehicleTypeName = activeSelType;
      } else if (activeDetType) {
        payload.overrideVehicleTypeName = activeDetType;
      }

      const res = await axios.post(
        "http://134.209.210.226:3000/api/parking/check-parking",
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setResultData(res.data);
      setDetectedPlate("");

      if (res.data.availableBikes !== undefined)
        props.setBikeCount(res.data.availableBikes);
      if (res.data.availableCars !== undefined)
        props.setCarCount(res.data.availableCars);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi hệ thống xử lý giao dịch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="camera-container">
      <div className="camera-main-layout">
        <div className="camera-box">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: "environment",
            }}
            className="camera-webcam"
          />
        </div>

        <div className="camera-control-panel">
          <h5>Biển số nhận diện:</h5>
          <div className="camera-plate-display">{detectedPlate || "---"}</div>

          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#333" }}>Loại xe: </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ marginLeft: 8, padding: "2px" }}
            >
              <option value="Auto">
                Auto {detectedType ? `(${detectedType})` : ""}
              </option>
              <option value="Motorbike">Xe máy</option>
              <option value="Car">Ô tô</option>
            </select>
          </div>

          <button
            disabled={true}
            style={{
              backgroundColor: loading ? "#95a5a6" : "#2980b9",
              cursor: "not-allowed",
            }}
            className="camera-confirm-btn"
          >
            {loading ? "ĐANG LƯU HÓA ĐƠN..." : "QUẸT THẺ"}
          </button>

          {resultData && (
            <div
              style={{
                backgroundColor:
                  resultData.status === "IN" ? "#d4edda" : "#fff3cd",
              }}
              className="camera-status-note"
            >
              <strong
                style={{
                  color: resultData.status === "IN" ? "#155724" : "#856404",
                }}
              >
                {resultData.status === "IN"
                  ? "XE VÀO BÃI THÀNH CÔNG"
                  : "XE RA BÃI THÀNH CÔNG"}
              </strong>
              <p>
                Biển số: <strong>{resultData.plate}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {resultData && (
        <div className="camera-result-section">
          <div className="camera-result-flex">
            <div className="camera-image-card">
              <h5 className="camera-text-success">📷 ẢNH LÚC VÀO</h5>
              <img
                src={resultData.imageIn || ""}
                className="camera-history-img"
                alt="Vehicle In"
              />
              <p>
                Thời gian: <strong>{resultData.timeIn}</strong>
              </p>
            </div>

            {resultData.status === "OUT" && (
              <>
                <div className="camera-image-card">
                  <h5 className="camera-text-danger">📷 ẢNH LÚC RA</h5>
                  <img
                    src={resultData.imageOut || ""}
                    className="camera-history-img"
                    alt="Vehicle Out"
                  />
                  <p>
                    Thời gian: <strong>{resultData.timeOut}</strong>
                  </p>
                </div>

                <div className="camera-payment-card">
                  <h4>HÓA ĐƠN TÍNH TIỀN</h4>
                  <p>
                    Tổng thời gian: <strong>{resultData.duration} phút</strong>
                  </p>
                  <p className="camera-text-note">({resultData.message})</p>
                  <h2 className="camera-price-text">
                    {resultData.price.toLocaleString("vi-VN")} VNĐ
                  </h2>
                  <button
                    onClick={() => setResultData(null)}
                    className="camera-close-btn"
                  >
                    Xác nhận đã thu tiền
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
