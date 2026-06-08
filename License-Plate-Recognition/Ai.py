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
yolo_LP_detect = torch.hub.load('yolov5', 'custom', path='model/LP_detector_nano_61.pt', source='local').to(device)
yolo_license_plate = torch.hub.load('yolov5', 'custom', path='model/LP_ocr_nano_62.pt', source='local').to(device)
yolo_license_plate.conf = 0.60

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

        if final_plate_text:
            sio.emit('detection_result', {'plate': final_plate_text}, to=sid)
        else:
            sio.emit('detection_result', {'plate': "Đang tìm..."}, to=sid)

    except Exception as e:
        print(f" Lỗi xử lý frame: {e}")

if __name__ == '__main__':
    print("68.183.102.106:5000")
eventlet.wsgi.server(eventlet.listen(('0.0.0.0', 5005)), app)