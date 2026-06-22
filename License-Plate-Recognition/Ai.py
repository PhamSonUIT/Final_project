import socketio
import eventlet
import cv2
import base64
import numpy as np
import torch
import function.utils_rotate as utils_rotate
import function.helper as helper

sio = socketio.Server(cors_allowed_origins='*')
app = socketio.WSGIApp(sio)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
# Tải model phát hiện vị trí biển số
yolo_LP_detect = torch.hub.load('yolov5', 'custom', path='model/LP_detector_nano_61.pt', source='local').to(device)
# Tải model nhận diện ký tự OCR
yolo_license_plate = torch.hub.load('yolov5', 'custom', path='model/LP_ocr_nano_62.pt', source='local').to(device)

# 🌟 SỬA 1: Hạ ngưỡng conf xuống 0.40 để bắt được biển thực tế khi bị nghiêng/chói nhẹ
yolo_license_plate.conf = 0.40 
yolo_LP_detect.conf = 0.40 # Ép cả model phát hiện nhạy hơn

@sio.on('connect')
def connect(sid, environ):
    print(f'Thiết bị kết nối: {sid}')

@sio.on('image_frame')
def handle_image(sid, data):
    try:
        img_data = base64.b64decode(data.split(',')[1])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None: return

        plates = yolo_LP_detect(frame, size=640)
        list_plates = plates.pandas().xyxy[0].values.tolist()
        
        final_plate_text = ""

        for plate in list_plates:
            x, y = int(plate[0]), int(plate[1])
            w, h = int(plate[2] - plate[0]), int(plate[3] - plate[1])
            crop_img = frame[y:y+h, x:x+w]
            
            if crop_img.size == 0: continue

            # 🌟 SỬA 2: TIỀN XỬ LÝ ẢNH CẮT ĐỂ CHỐNG LÓA SÁNG THỰC TẾ
            try:
                # Chuyển vùng biển số về ảnh xám
                gray_crop = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
                # Dùng thuật toán CLAHE để tự động kéo độ tương phản, làm rõ nét ký tự bị chói nắng/đèn
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                equalized_crop = clahe.apply(gray_crop)
                # Trả ngược về định dạng 3 kênh màu để đưa vào YOLO OCR đọc
                processed_crop = cv2.cvtColor(equalized_crop, cv2.COLOR_GRAY2BGR)
            except Exception as ex:
                print(f"Lỗi tiền xử lý chống lóa: {ex}")
                processed_crop = crop_img # Khôi phục dùng ảnh gốc nếu lỗi đầu vào

            flag = 0
            for cc in range(0, 2):
                for ct in range(0, 2):
                    # Đưa ảnh đã qua xử lý chống lóa vào xoay thẳng góc (deskew)
                    deskewed = utils_rotate.deskew(processed_crop, cc, ct)
                    lp = helper.read_plate(yolo_license_plate, deskewed)
                    
                    if lp != "unknown" and len(lp) >= 4: # Thêm điều kiện chuỗi ký tự hợp lệ
                        final_plate_text = lp
                        flag = 1
                        break
                if flag == 1: break
            if flag == 1: break

        if final_plate_text:
            cleaned_text = final_plate_text.replace(" ", "").replace(".", "").replace("-", "").upper()
            sio.emit('detection_result', {'plate': cleaned_text}, to=sid)
        else:
            sio.emit('detection_result', {'plate': "Đang tìm..."}, to=sid)

    except Exception as e:
        print(f" Lỗi xử lý frame: {e}")

if __name__ == '__main__':
    print("AI Service đang chạy tại port 5005...")
eventlet.wsgi.server(eventlet.listen(('0.0.0.0', 5005)), app)