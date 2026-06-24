import socketio
import eventlet
import cv2
import base64
import numpy as np
import torch
import time
import function.utils_rotate as utils_rotate
import function.helper as helper
import sys

sio = socketio.Server(cors_allowed_origins='*')
app = socketio.WSGIApp(sio)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


ckpt_detect = torch.load('model/best.pt', map_location=device, weights_only=False)
yolo_LP_detect = ckpt_detect['ema' if ckpt_detect.get('ema') else 'model'].float().fuse().eval()

ckpt_ocr = torch.load('model/LP_ocr_nano_62.pt', map_location=device, weights_only=False)
yolo_license_plate = ckpt_ocr['ema' if ckpt_ocr.get('ema') else 'model'].float().fuse().eval()

yolo_LP_detect.names = {0: 'license_plate'}
yolo_license_plate.conf = 0.60


@sio.on('connect')
def connect(sid, environ):
    print(f'Thiết bị bến bãi kết nối: {sid}')

@sio.on('image_frame')
def handle_image(sid, data):
    try:
        # Giải mã luồng ảnh Base64 từ Frontend gửi lên real-time
        img_data = base64.b64decode(data.split(',')[1])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None: return

        # Giai đoạn 1: Định vị vùng chứa biển số xe (Detector)
        # Sử dụng mô hình lõi đã được bóc tách trực tiếp
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

        # Trả kết quả nhận diện real-time về cho Frontend
        if final_plate_text:
            sio.emit('detection_result', {'plate': final_plate_text}, to=sid)
        else:
            sio.emit('detection_result', {'plate': "Đang tìm..."}, to=sid)

    except Exception as e:
        print(f"Lỗi xử lý frame ảnh: {e}")

if __name__ == '__main__':
    print("Server Endpoint: 134.209.210.226:5000")

eventlet.wsgi.server(eventlet.listen(('0.0.0.0', 5005)), app)