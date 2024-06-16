import openai
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Initialize the OpenAI API client
openai.api_key = OPENAI_API_KEY

def update_transcript(fixed_text, words):
    completion = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": """Given a transcription with word-level timing and a fixed transcription text, your task is to predict and generate a new JSON object with updated word-level timing that aligns with the fixed transcription text. Use the provided timing information to make the best possible predictions for the new timings. Be aligned perfectly to the full text that given you, don't miss a letter or a word, try to predict the timing the best you can. where word not changed leave it as is, where new words appear make the timing between the old words. where word replaced - keep the old timing for the new word. Respond in the format: { "type": "json_object" }."""
            },
            {
                "role": "user",
                "content": f"Fixed Text: {fixed_text}\n\nWords: {words}"
            }
        ],
        response_format={ "type": "json_object" }
    )

    return completion.choices[0].message.content
