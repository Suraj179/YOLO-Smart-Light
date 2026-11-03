
import cv2
import requests
from ultralytics import YOLO

# --------------------------------
# CONFIGURATION
# --------------------------------

NODE_SERVER_URL = "http://localhost:3000/api/detection"

IMAGE_UPLOAD_URL = "http://localhost:3000/api/history"

# Load YOLO model
model = YOLO("../python/yolo11n.pt")

# Open webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Error: Cannot access webcam")
    exit()

# Previous detection state
previous_state = False

# HTTP session for backend communication
session = requests.Session()

print("YOLO state detection started")
print("Image evidence upload enabled")
print("Press Q to quit")


while True:

    # Capture frame
    ret, frame = cap.read()

    if not ret:
        print("Failed to capture frame")
        break

    # Run YOLO
    results = model(frame, verbose=False)

    # Current detection state
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
                f"STATE CHANGE -> PERSON_DETECTED "
                f"(confidence={highest_confidence:.2f})"
            )

        else:

            print("STATE CHANGE -> PERSON_LEFT")

        # Prepare detection information
        detection_data = {
            "personDetected": person_detected,
            "confidence": highest_confidence
        }

        try:

            # --------------------------------
            # 1. SEND DETECTION TO NODE.JS
            # --------------------------------

            response = session.post(
                NODE_SERVER_URL,
                json=detection_data,
                timeout=5
            )

            response.raise_for_status()

            response_data = response.json()

            print("Node.js response:", response_data)

            # Retrieve the newly created history event ID
            event_id = response_data.get("eventId")

            if event_id is None:
                print(
                    "Warning: Backend did not return an event ID."
                )

            else:

                # --------------------------------
                # 2. ENCODE CURRENT FRAME AS JPEG
                # --------------------------------

                success, encoded_image = cv2.imencode(
                    ".jpg",
                    frame,
                    [cv2.IMWRITE_JPEG_QUALITY, 85]
                )

                if not success:
                    print("Could not encode image.")
                else:

                    image_bytes = encoded_image.tobytes()

                    # --------------------------------
                    # 3. UPLOAD IMAGE TO NODE.JS
                    # --------------------------------

                    upload_url = (
                        f"{IMAGE_UPLOAD_URL}/{event_id}/image"
                    )

                    files = {
                        "image": (
                            f"event-{event_id}.jpg",
                            image_bytes,
                            "image/jpeg"
                        )
                    }

                    try:

                        upload_response = session.post(
                            upload_url,
                            files=files,
                            timeout=10
                        )

                        upload_response.raise_for_status()

                        print(
                            "Image upload response:",
                            upload_response.json()
                        )

                    except requests.RequestException as error:

                        print(
                            "Image upload failed:",
                            error
                        )

        except requests.RequestException as error:

            print(
                "Could not connect to Node.js:",
                error
            )

    # Update previous detection state
    previous_state = person_detected

    # --------------------------------
    # DISPLAY CURRENT STATE
    # --------------------------------

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


# --------------------------------
# CLEANUP
# --------------------------------

cap.release()
cv2.destroyAllWindows()
session.close()

print("YOLO detection stopped.")
