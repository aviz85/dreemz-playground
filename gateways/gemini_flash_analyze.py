import os
import time
import json
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def upload_to_gemini(path, mime_type=None):
    """Uploads the given file to Gemini."""
    file = genai.upload_file(path, mime_type=mime_type)
    print(f"Uploaded file '{file.display_name}' as: {file.uri}")
    return file

def wait_for_files_active(files):
    """Waits for the given files to be active."""
    print("Waiting for file processing...")
    for name in (file.name for file in files):
        file = genai.get_file(name)
        while file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(10)
            file = genai.get_file(name)
        if file.state.name != "ACTIVE":
            raise Exception(f"File {file.name} failed to process")
    print("...all files ready")
    print()

generation_config = {
    "temperature": 0,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
    system_instruction="Analyze this video and extract the following details in JSON format. Each key should have a short value (up to 3 words): Video Quality, Composition, Lighting, Audio, Energy, Smile, Scene, Pace, Golden tip (to improve the video). The response should be JSON format only, without any prefix or suffix. Golden Tip should be the last one. add emoji after every category inside the value parenthesis. make sure you give me valid JSON string and only valid JSON string",
)

def analyze_video(filepath):
    file = upload_to_gemini(filepath, mime_type="video/mp4")
    wait_for_files_active([file])
    
    chat_session = model.start_chat(
        history=[
            {
                "role": "user",
                "parts": [file],
            },
        ]
    )
    # Add a valid prompt for the video analysis
    prompt = "Analyze the video for quality and provide improvements."
    response = chat_session.send_message(prompt)
    
    # Clean the response text to extract the JSON
    raw_text = response.text
    start = raw_text.find('{')
    end = raw_text.rfind('}') + 1
    
    if start == -1 or end == -1:
        raise ValueError("Invalid JSON format in the response text")
    
    clean_json_string = raw_text[start:end]
    
    return clean_json_string
