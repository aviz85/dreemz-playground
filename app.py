from flask import Flask, render_template, request, redirect, url_for, jsonify
import os
import subprocess
from dotenv import load_dotenv
import uuid
from gateways.whisper_transcript import get_transcript_from_openai
from gateways.gemini_flash_analyze import analyze_video
from gateways.openai_update_transcript import update_transcript

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load environment variables
load_dotenv()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    if 'video' not in request.files:
        return redirect(request.url)
    file = request.files['video']
    if file.filename == '':
        return redirect(request.url)
    if file:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)
        return redirect(url_for('process', filename=file.filename))

@app.route('/process/<filename>')
def process(filename):
    return render_template('process.html', filename=filename)

@app.route('/video-analyze', methods=['POST'])
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

@app.route('/save', methods=['POST'])
def save():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    video_file = request.files['video']

    try:
        # Create a new folder with a UUID
        folder_name = str(uuid.uuid4())
        folder_path = os.path.join(app.config['UPLOAD_FOLDER'], folder_name)
        os.makedirs(folder_path, exist_ok=True)

        # Save the video file in the new folder
        video_filename = 'video.webm'  # or extract the file type from the header
        video_path = os.path.join(folder_path, video_filename)
        video_file.save(video_path)
        
        return jsonify({'folder': folder_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/update-transcript', methods=['POST'])
def update_transcript_route():
    full_text = request.form['transcription']
    words_timing = request.form['wordsTiming']
    
    # Call the function from gateways
    new_words_timing = update_transcript(full_text, words_timing)
    
    # Return the updated words timing to the client
    return jsonify(newWordsTiming=new_words_timing)

if __name__ == '__main__':
    app.run(debug=True, port=5002)
