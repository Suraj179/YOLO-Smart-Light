import cv2
import requests
from ultralytics import YOLO

NODE_SERVER_URL = "http://localhost:3000/api/detection"

# Load YOLO model
# model = YOLO("yolo11n.pt")
model = YOLO("E:/YOLO-Smart-Light/python/yolo11n.pt")

# Open webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Error: Cannot access webcam")
    exit()

# Previous detection state
previous_state = False

print("YOLO state detection started")
print("Press Q to quit")

while True:

    # Capture frame
    ret, frame = cap.read()

    if not ret:
        print("Failed to capture frame")
        break

    # Run YOLO
    results = model(frame, verbose=False)

    # Current state
    person_detected = False
    highest_confidence = 0.0

    # Process detections
    for result in results:

        for box in result.boxes:

            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            # Person detected
            if class_id == 0 and confidence >= 0.5:

                person_detected = True

                if confidence > highest_confidence:
                    highest_confidence = confidence

                # Bounding box
                x1, y1, x2, y2 = map(
                    int,
                    box.xyxy[0]
                )

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2
                )

                label = f"Person {confidence:.2f}"

                cv2.putText(
                    frame,
                    label,
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2
                )

    # --------------------------------
    # STATE CHANGE DETECTION
    # --------------------------------

    if person_detected != previous_state:

        if person_detected:

            print(
                f"STATE CHANGE → PERSON_DETECTED "
                f"(confidence={highest_confidence:.2f})"
            )

        else:

            print("STATE CHANGE → PERSON_LEFT")

        # Send state change to Node.js
        detection_data = {
            "personDetected": person_detected,
            "confidence": highest_confidence
        }

        try:

            response = requests.post(
                NODE_SERVER_URL,
                json=detection_data,
                timeout=2
            )

            print(
                "Node.js response:",
                response.json()
            )

        except requests.RequestException as error:

            print(
                "Could not connect to Node.js:",
                error
            )

    # Update previous state
    previous_state = person_detected

    # Display current state
    if person_detected:
        status = "PERSON DETECTED"
    else:
        status = "NO PERSON"

    cv2.putText(
        frame,
        status,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2
    )

    cv2.imshow(
        "YOLO Phase 2",
        frame
    )

    # Quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()