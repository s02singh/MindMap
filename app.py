from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
import openai
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()
app = Flask(__name__)
CORS(app)  # Enable CORS for the entire app

# Access the OpenAI API key from environment variables
openai_api_key = os.getenv('OPENAI_API_KEY')
@app.route('/generate_ideas', methods=['POST'])
def generate_ideas():
    data = request.json
    user_input = data.get('input', '')
    expand_node = data.get('expand', False)  # Check if this is an expansion request

    prompt = "You are an expert brainstorming assistant. Generate a series of interconnected ideas for a mindmap."

    if expand_node:
        # If expanding a node, the prompt is more focused on branching that specific idea
        prompt += f" Expand on this specific idea: {user_input}. Break it into actionable, related sub-ideas."
    else:
        # Initial idea generation
        prompt += f" Based on this concept: {user_input}. Keep it concise and insightful."

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an expert brainstorming assistant who generates creative, concise ideas connected in a meaningful, structured hierarchy."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=400,
        n=1,
        temperature=0.7,
    )

    raw_suggestions = response['choices'][0]['message']['content'].strip()
    suggestions = [idea.strip('- ') for idea in raw_suggestions.split('\n') if idea.strip()]

    return jsonify({"ideas": suggestions})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
