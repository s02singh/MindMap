from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
from dotenv import load_dotenv
import os
import json

load_dotenv()
app = Flask(__name__)
CORS(app)  # Enable CORS for the entire app

openai.api_key = os.getenv('OPENAI_API_KEY')

@app.route('/generate_ideas', methods=['POST'])
def generate_ideas():
    data = request.json
    user_input = data.get('input', '')
    expand_node = data.get('expand', False)
    limit = data.get('limit', 3)

    # Refined prompt for concise ideas
    if expand_node:
        prompt = (
            f"Provide {limit} concise keywords or short phrases that expand upon the following concept:\n\n"
            f"\"{user_input}\"\n\n"
            "Each should be no more than a few words, capturing the essence of an idea suitable for a mind map node."
        )
    else:
        prompt = (
            f"Generate {limit} concise and intelligent keywords or short phrases related to the following topic:\n\n"
            f"\"{user_input}\"\n\n"
            "Each should be brief and to the point, ideal for labeling nodes in a mind map."
        )

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You generate concise, insightful keywords or phrases for mind maps."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=50,  # Reduced max_tokens for brevity
            n=1,
            temperature=0.7,  # Balanced creativity
        )

        raw_suggestions = response['choices'][0]['message']['content'].strip()
        # Split on line breaks or bullet points, remove numbering
        suggestions = [idea.strip('-•1234567890. ') for idea in raw_suggestions.split('\n') if idea.strip()]
        suggestions = suggestions[:limit]

        return jsonify({"ideas": suggestions})

    except Exception as e:
        print(f"Error in generate_ideas: {e}")
        return jsonify({"ideas": []})

@app.route('/auto_restructure', methods=['POST'])
def auto_restructure():
    data = request.json
    nodes = data.get('nodes', [])

    if len(nodes) < 2:
        return jsonify({"connections": []})

    # Build the prompt for the AI model
    node_labels = [f"{node['id']}: {node['label']}" for node in nodes]
    node_list_str = "\n".join(node_labels)

    prompt = f"""
You are an expert in understanding relationships between concepts. Given the following list of ideas with their IDs, suggest pairs of IDs that should be connected due to related content.

Ideas:
{node_list_str}

Provide a list of pairs of IDs that should be connected. Only provide the list of pairs in JSON format as follows:
[
    {{"from": ID1, "to": ID2}},
    {{"from": ID3, "to": ID4}},
    ...
]
Do not include any explanation.
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You help identify relationships between ideas."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            n=1,
            temperature=0.5,
        )

        content = response['choices'][0]['message']['content'].strip()

        # Try to parse the content as JSON
        connections = json.loads(content)

        # Validate connections
        valid_connections = []
        for conn in connections:
            if 'from' in conn and 'to' in conn:
                valid_connections.append({
                    "id": int(os.urandom(4).hex(), 16),
                    "from": conn['from'],
                    "to": conn['to']
                })

        return jsonify({"connections": valid_connections})

    except Exception as e:
        print(f"Error in auto_restructure: {e}")
        return jsonify({"connections": []})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
