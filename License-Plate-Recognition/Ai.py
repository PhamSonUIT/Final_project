import sys
import os
from pathlib import Path

# 1. Định vị và ép hệ thống nhận diện đúng thư mục yolov5 làm root ưu tiên cao nhất
FILE = Path(__file__).resolve()
ROOT = FILE.parents[0] / 'yolov5'
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import socketio
import eventlet
import cv2
import base64
import numpy as np
import torch
import time  # Khai báo đầy đủ thư viện tính toán thời gian
import function.utils_rotate as utils_rotate
import function.helper as helper
from yolov5.models.common import DetectMultiBackend

# 2. Khởi tạo Socket.IO Server cấu hình CORS toàn cục
sio = socketio.Server(cors_allowed_origins='*')
app = socketio.WSGIApp(sio)

# 3. Cấu hình thiết bị phần cứng (Tự động nhận CUDA nếu chạy trên Server có GPU, ngược lại dùng CPU)
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

print("--> Đang nạp hệ thống mô hình AI hai giai đoạn (Two-stage Pipeline)...")

# Nạp trực tiếp qua Backend của Ultralytics để tránh lỗi AttributeError: Can't get attribute 'DetectionModel'
yolo_LP_detect = DetectMultiBackend('model/best.pt', device=device)
yolo_license_plate = DetectMultiBackend('model/LP_ocr_nano_62.pt', device=device)

# Ép đồng bộ tên phân lớp để khớp 100% với logic code bến bãi cũ của bạn
yolo_LP_detect.names = {0: 'license_plate'}
yolo_license_plate.conf = 0.60

print("--> Hệ thống AI đã sẵn sàng. Đang lắng nghe kết nối tại cổng 5005...")

@sio.on('connect')
def connect(sid, environ):
    print(f' Thiết bị bến bãi kết nối thành công: {sid}')

@sio.on('image_frame')
def handle_image(sid, data):
    try:
        # Giải mã luồng ảnh Base64 từ Frontend gửi lên real-time
        img_data = base64.b64decode(data.split(',')[1])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None: return

        # Giai đoạn 1: Định vị vùng chứa biển số xe (Detector)
        plates = yolo_LP_detect(frame, size=640)
        list_plates = plates.pandas().xyxy[0].values.tolist()
        
        final_plate_text = ""

        # Duyệt qua các vùng biển số tìm được để cắt ảnh (Crop)
        for plate in list_plates:
            x, y = int(plate[0]), int(plate[1])
            w, h = int(plate[2] - plate[0]), int(plate[3] - plate[1])
            crop_img = frame[y:y+h, x:x+w]
            
            if crop_img.size == 0: continue

            # Giai đoạn 2: Vòng lặp xoay ảnh chống nghiêng (Deskew) và đọc ký tự (OCR)
            flag = 0
            for cc in range(0, 2):
                for ct in range(0, 2):
                    deskewed = utils_rotate.deskew(crop_img, cc, ct)
                    lp = helper.read_plate(yolo_license_plate, deskewed)
                    
                    if lp != "unknown":
                        final_plate_text = lp
                        flag = 1
                        break
                if flag == 1: break
            if flag == 1: break

        # Trả kết quả nhận diện real-time về cho đúng cổng thiết bị đang yêu cầu
        if final_plate_text:
            sio.emit('detection_result', {'plate': final_plate_text}, to=sid)
        else:
            sio.emit('detection_result', {'plate': "Đang tìm..."}, to=sid)

    except Exception as e:
        print(f"❌ Lỗi xử lý frame ảnh: {e}")

if __name__ == '__main__':
    print("📍 Server Endpoint: 134.209.210.226:5000")

# Bật bệ phóng Socket chạy trên cổng 5005
eventlet.wsgi.server(eventlet.listen(('0.0.0.0', 5005)), app)