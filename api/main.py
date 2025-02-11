import os
from flask import Blueprint, jsonify, render_template, flash, send_from_directory, session, request, current_app, g
import uuid
from .utils import requires_auth, get_distinct_column_values
from ultralytics import YOLO
from PIL import Image 

# Create a Blueprint for the login
homepage = Blueprint('homepage', __name__)


# Path to save uploaded and processed images
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads')
PROCESSED_FOLDER = os.path.join(os.getcwd(), 'static', 'processed')

# Main app page
@homepage.route('/', defaults={'path': ''}, methods = ['GET','POST'])
@homepage.route('/<path:path>', methods = ['GET','POST'])
def main(path):
    # Pass the APP_SCRIPT_ROOT to the template
    app_script_root = current_app.config.get('APP_SCRIPT_ROOT', '/default/path/')
    return render_template('app.jinja2')
    
    
# # For the favicon.ico
# @homepage.route('/favicon', methods = ['GET'])
# def icon():
#     return send_from_directory('static','icons/orange.png')

# # Route to serve loader.gif
# @homepage.route('/assets/<filename>', methods=['GET'])
# def serve_asset(filename):
#     return send_from_directory('static', f'icons/{filename}')

@homepage.route('/object-detection/detect', methods=['POST'])
def detect():
    try:
        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': 'No files uploaded'}), 400

        results = []
        final_detection_count = 0
        for file in files:
            if file.filename == '':
                continue  # skip empty

            # 1) Save each uploaded file
            filename = f"{uuid.uuid4().hex}_{file.filename}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)

            # 2) Run YOLO
            model = YOLO("api/models/seastar-v4.pt")
            yolo_results = model.predict(
                source=filepath,
                save=True,
                project=PROCESSED_FOLDER,
                name='results',
                conf=0.5,
                save_txt=True,
                save_conf=True
            )

            # 3) Identify the processed image path
            save_dir = str(yolo_results[0].save_dir).split("/")[-1]
            # Get the original file extension
            file_extension = filename.rsplit('.', 1)[-1]

            # Path of the saved YOLO output (which is .jpg by default)
            yolo_saved_path = os.path.join("static", "processed", save_dir, f"{filename.rsplit('.', 1)[0]}.jpg")

            # Update the output path to include the original extension
            output_path = os.path.join("static", "processed", save_dir, f"{filename.rsplit('.', 1)[0]}.{file_extension}")

            # Rename the saved YOLO output file to retain the original extension
            if os.path.exists(yolo_saved_path):
                os.rename(yolo_saved_path, output_path)
            label_file = os.path.join("static", "processed", save_dir, "labels", f"{filename.rsplit('.', 1)[0]}.txt")

            # 4) Count detections + build inference string
            detection_count = sum(len(r.boxes) for r in yolo_results)
            if detection_count == 0:
                inference_result = "No detection found"
                processed_image_url = f'/object-detection/static/uploads/{filename}'
            else:
                final_detection_count += detection_count
                os.system(f"cp {output_path} {PROCESSED_FOLDER}")
                os.system(f"cp {label_file} {PROCESSED_FOLDER}")
                inference_result = f"Number of seastar in this image: {detection_count}"
                processed_image_url = f'/object-detection/static/processed/{filename}'

            # 5) Optionally parse YOLO label file to build bounding-box array
            detections = []
            img = Image.open(filepath)
            img_width, img_height = img.size

            if os.path.exists(label_file):
                with open(label_file, 'r') as f:
                    lines = f.readlines()
                    for line in lines:
                        parts = line.strip().split()
                        if len(parts) < 6:
                            continue
                        cls_id, x_c, y_c, w, h, conf = parts[:6]
                        x_c = float(x_c)
                        y_c = float(y_c)
                        w = float(w)
                        h = float(h)

                        pixel_x_center = x_c * img_width
                        pixel_y_center = y_c * img_height
                        pixel_w = w * img_width
                        pixel_h = h * img_height

                        box_x = pixel_x_center - (pixel_w / 2)
                        box_y = pixel_y_center - (pixel_h / 2)

                        detections.append({
                            "class": int(cls_id),
                            "x": box_x,
                            "y": box_y,
                            "width": pixel_w,
                            "height": pixel_h,
                        })

            # 6) Collect the result for this single file
            single_result = {
                'inference_result': inference_result,
                'processed_image_url': processed_image_url,
                'detection_count': detection_count
            }
            results.append(single_result)
        print(results)
        # Return an array of all results
        return jsonify({'results': results})

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

# Serve uploaded files
@homepage.route('/object-detection/static/uploads/<filename>', methods=['GET'])
def serve_uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@homepage.route('/object-detection/static/processed/<filename>', methods=['GET'])
def serve_processed_file(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)


@homepage.errorhandler(Exception)
def homepage_error_handler(error):
    print(error)
    return jsonify({"error" : str(error)})
