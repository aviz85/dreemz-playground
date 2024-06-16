from flask import Flask, render_template, request, redirect, url_for, jsonify, send_from_directory
import os
import subprocess
from dotenv import load_dotenv
import uuid
import base64
from gateways.whisper_transcript import get_transcript_from_openai
from gateways.gemini_flash_analyze import analyze_video
from gateways.openai_update_transcript import update_transcript
from flask_httpauth import HTTPBasicAuth

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
auth = HTTPBasicAuth()

# Ensure the uploads folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load environment variables
load_dotenv()

# Get username and password from environment variables
USERNAME = os.getenv('USERNAME')
PASSWORD = os.getenv('PASSWORD')

# Define a function to verify the username and password
@auth.verify_password
def verify_password(username, password):
    if username == USERNAME and password == PASSWORD:
        return True
    return False

@app.route('/')
@auth.login_required
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
@auth.login_required
def upload():
    print("Upload route accessed")  # Debug statement

    video_data = request.form.get('video')
    if not video_data:
        print("No video part in the request data")  # Debug statement
        return redirect(request.url)
    
    # Extract the Base64 part from the data URL
    base64_data = video_data.split(",")[1]
    
    # Decode the Base64 data
    video_bytes = base64.b64decode(base64_data)
    
    # Save the video file in a new folder with a UUID
    folder_name = str(uuid.uuid4())
    folder_path = os.path.join(app.config['UPLOAD_FOLDER'], folder_name)
    os.makedirs(folder_path, exist_ok=True)
    
    video_filename = 'video.webm'
    video_path = os.path.join(folder_path, video_filename)
    
    with open(video_path, "wb") as video_file:
        video_file.write(video_bytes)
    
    print(f"Saved video file to: {video_path}")  # Debug statement

    return render_template('description.html', video_path=video_path)

@app.route('/video-analyze', methods=['POST'])
@auth.login_required
def video_analyze():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'Empty filename provided'}), 400
    original_filename = file.filename
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"transcript_{original_filename}")
    file.save(filepath)

    # Extract audio from video using ffmpeg via subprocess
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"audio_{os.path.splitext(original_filename)[0]}.wav")
    try:
        subprocess.run(['ffmpeg', '-i', filepath, '-q:a', '0', '-map', 'a', audio_path, '-y'], check=True)
    except subprocess.CalledProcessError as e:
        return jsonify({'error': str(e)}), 500

    # Call transcription function
    try:
        words = get_transcript_from_openai(audio_path)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'transcription': words})

@app.route('/transcript', methods=['POST'])
@auth.login_required
def transcript():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'Empty filename provided'}), 400
    original_filename = file.filename
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"transcript_{original_filename}")
    file.save(filepath)

    # Extract audio from video using ffmpeg via subprocess
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"audio_{os.path.splitext(original_filename)[0]}.wav")
    try:
        subprocess.run(['ffmpeg', '-i', filepath, '-q:a', '0', '-map', 'a', audio_path, '-y'], check=True)
    except subprocess.CalledProcessError as e:
        return jsonify({'error': str(e)}), 500

    # Call transcription function
    try:
        words = get_transcript_from_openai(audio_path)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'transcription': words})

@app.route('/analyze', methods=['POST'])
@auth.login_required
def analyze():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'Empty filename provided'}), 400
    original_filename = file.filename
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"analysis_{original_filename}")
    file.save(filepath)

    # Call the analyze video function
    try:
        analysis = analyze_video(filepath)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'analysis': analysis})

@app.route('/update-transcript', methods=['POST'])
@auth.login_required
def update_transcript_route():
    full_text = request.form['transcription']
    words_timing = request.form['wordsTiming']
    
    # Call the function from gateways
    new_words_timing = update_transcript(full_text, words_timing)
    
    # Return the updated words timing to the client
    return jsonify(newWordsTiming=new_words_timing)

@app.route('/uploads/<folder>/<filename>')
@auth.login_required
def uploaded_file(folder, filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], folder), filename)


if __name__ == '__main__':
    app.run(debug=True, port=5002)
