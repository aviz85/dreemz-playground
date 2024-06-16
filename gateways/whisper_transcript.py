import openai
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Initialize the OpenAI API client
openai.api_key = OPENAI_API_KEY

def get_transcript_from_openai(audio_file_path):
    with open(audio_file_path, 'rb') as audio_file:
            transcript = openai.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )
    return transcript.words
