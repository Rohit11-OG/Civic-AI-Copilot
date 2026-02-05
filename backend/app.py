"""
Civic AI Copilot - Flask Backend
CivicMate: Legal document simplification for Indian citizens
Using Groq API with Llama 3.2 Vision (FREE!)
"""

import os
import json
import base64
import fitz  # PyMuPDF
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'pdf'}  # Support PDF
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Configure Groq
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)
else:
    client = None
    print("⚠️  WARNING: GROQ_API_KEY not set. AI features will not work.")

# Model for vision tasks - Llama 4 Scout supports multimodal
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
TEXT_MODEL = "llama-3.3-70b-versatile"


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def convert_pdf_to_image(file_stream):
    """Convert first page of PDF to image bytes"""
    doc = fitz.open(stream=file_stream, filetype="pdf")
    page = doc.load_page(0)  # Get first page
    pix = page.get_pixmap()
    img_data = pix.tobytes("png")
    return img_data


def get_legal_prompt(language="Hindi"):
    """Get the prompt for legal document analysis"""
    return f'''You are a helpful assistant explaining legal documents to everyday Indian citizens who may not understand legal language.

Analyze the uploaded document carefully. Extract all text you can see and understand the context.

Please respond in simple {language} that a Class 10 student would understand.

Provide your response in this EXACT JSON format (no markdown, just pure JSON):
{{
  "document_type": "What kind of document is this (e.g., legal notice, court summons, society notice, RTI response)",
  "simple_summary": "2-3 sentences explaining what this document is about in very simple words",
  "key_points": ["Important point 1", "Important point 2", "Important point 3"],
  "risks_and_deadlines": [
    {{"risk": "Description of the risk", "deadline": "Date if mentioned, otherwise null", "severity": "HIGH/MEDIUM/LOW"}}
  ],
  "recommended_actions": ["First thing to do", "Second thing to do"],
  "draft_reply": "A polite, formal draft reply if applicable, or null if not needed",
  "important_dates": ["List any important dates mentioned"],
  "parties_involved": {{"sender": "Who sent this", "receiver": "Who received this"}},
  "disclaimer": "⚠️ यह कानूनी सलाह नहीं है। कृपया अपनी विशिष्ट स्थिति के लिए किसी योग्य वकील से परामर्श करें।"
}}

IMPORTANT RULES:
- Use everyday Hindi/Marathi words, avoid English legal jargon
- If you see dates or deadlines, highlight them prominently
- If the document threatens serious consequences (eviction, arrest, large fines), clearly state this with HIGH severity
- For HIGH severity risks, suggest the FIRST action to take within 24 hours
- Always include the disclaimer in Hindi
- Return ONLY valid JSON, no additional text or markdown'''


def get_sustainability_prompt(language="Hindi"):
    """Get the prompt for sustainability analysis"""
    return f'''You are a friendly environmental advisor helping Indian families reduce their carbon footprint.

Analyze the uploaded receipt or the described habits/items carefully.

Identify and categorize all items into: electricity, transport, plastic, food, water, energy, waste, etc.

Respond in simple English that everyone can understand.

Provide your response in this EXACT JSON format (no markdown, just pure JSON):
{{
  "item_or_habit": "Overall summary of what was analyzed",
  "environmental_impact": "Simple explanation using relatable comparisons",
  "impact_score": 7,
  "impact_category": "HIGH/MEDIUM/LOW",
  
  "harmful_summary": "A 2-3 sentence summary explaining what harmful items were found in the uploaded receipt/text and their overall impact",
  
  "harmful_items": [
    {{
      "category": "electricity",
      "icon": "⚡",
      "title": "High Electricity Usage",
      "value": "500 kWh",
      "impact": "Equivalent to 250kg CO₂",
      "severity": "HIGH",
      "detailed_info": {{
        "explanation": "Your electricity consumption is 40% higher than average households",
        "breakdown": "Appliances: 60%, Lighting: 25%, AC: 15%",
        "yearly_impact": "3000 kg CO₂ annually",
        "comparison": "Equal to driving 7500 km per year"
      }}
    }},
    {{
      "category": "plastic",
      "icon": "♻️",
      "title": "Plastic Bottles",
      "value": "10 bottles",
      "impact": "200g plastic waste",
      "severity": "MEDIUM",
      "detailed_info": {{
        "explanation": "Single-use plastic bottles take 450 years to decompose",
        "breakdown": "10 bottles = 200g plastic waste per week",
        "yearly_impact": "10.4 kg plastic waste annually",
        "comparison": "Equivalent to 520 bottles per year"
      }}
    }}
  ],
  
  "beneficial_summary": "A 2-3 sentence summary explaining the sustainable alternatives being recommended and how they will help reduce environmental impact",
  
  "beneficial_alternatives": [
    {{
      "category": "electricity",
      "icon": "💡",
      "title": "Switch to LED Bulbs",
      "savings": "200 kWh/month",
      "benefit": "Save ₹800 and 100kg CO₂",
      "difficulty": "Easy",
      "detailed_info": {{
        "steps": "1. Buy LED bulbs 2. Replace old bulbs 3. Dispose properly at e-waste center",
        "cost": "₹200-500 initial investment",
        "payback": "Pays back in 2-3 months",
        "long_term": "Save ₹9600 annually, lasts 10x longer"
      }}
    }},
    {{
      "category": "plastic",
      "icon": "🌿",
      "title": "Use Reusable Water Bottle",
      "savings": "10 bottles/month",
      "benefit": "Avoid 200g plastic waste",
      "difficulty": "Easy",
      "detailed_info": {{
        "steps": "1. Buy a good quality bottle 2. Carry it daily 3. Refill from home/office",
        "cost": "₹300-800 one-time cost",
        "payback": "Pays back in 1 month",
        "long_term": "Save ₹3600 annually, avoid 10kg plastic"
      }}
    }}
  ],
  
  "good_items": [
    {{
      "category": "sustainable_product",
      "icon": "✅",
      "title": "Bought Reusable Bag",
      "praise": "Great choice! Saves 50g plastic per use"
    }}
  ],
  
  "easy_alternatives": [
    {{"action": "What to do instead", "savings": "How much it saves (money or environment)", "difficulty": "Easy/Medium"}}
  ],
  
  "monthly_savings_estimate": "Estimated ₹ savings if they switch",
  "fun_fact": "One interesting fact about this environmental impact",
  "local_tip": "A tip specific to Indian context"
}}

IMPORTANT RULES:
- Analyze ALL items in the receipt/text
- Categorize each item: electricity, transport, plastic, food, water, energy, waste, etc.
- harmful_items: List ALL harmful/unsustainable items found (can be 1-10 items)
- beneficial_alternatives: For EACH harmful item, suggest a specific alternative
- good_items: If any sustainable/good items found, list them here (can be empty array)
- Use appropriate icons for each category:
  * Electricity: ⚡, 🔌, 💡
  * Transport: 🚗, 🚌, 🚴, ✈️
  * Plastic: ♻️, 🥤, 🛍️
  * Food: 🍔, 🥗, 🍖
  * Water: 💧, 🚿
  * Energy: 🔥, ⛽, 🌞
  * Waste: 🗑️, ♻️
- severity: HIGH (dark red), MEDIUM (orange), LOW (yellow)
- Keep suggestions realistic for Indian middle-class families
- Use ₹ for money, km for distance, kg for weight
- Return ONLY valid JSON, no additional text'''


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "groq_configured": GROQ_API_KEY is not None,
        "vision_model": VISION_MODEL,
        "text_model": TEXT_MODEL
    })


@app.route('/analyze/legal', methods=['POST'])
def analyze_legal():
    """Analyze a legal document"""
    if not client:
        return jsonify({"error": "Groq API key not configured"}), 500
    
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
        
        # Get language preference
        language = request.form.get('language', 'Hindi')
        
        # Read file content
        file_content = file.read()
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        
        # Handle PDF vs Image
        if file_extension == 'pdf':
            image_data = convert_pdf_to_image(file_content)
            mime_type = 'image/png'
            image_base64 = base64.b64encode(image_data).decode('utf-8')
        else:
            mime_type = f'image/{file_extension}'
            if file_extension == 'jpg':
                mime_type = 'image/jpeg'
            image_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Create the prompt
        prompt = get_legal_prompt(language)
        
        # Call Groq API with vision
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        # Parse the JSON response
        response_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('\n', 1)[1]
            response_text = response_text.rsplit('```', 1)[0]
        if response_text.startswith('json'):
            response_text = response_text[4:].strip()
        
        result = json.loads(response_text)
        
        return jsonify({
            "success": True,
            "analysis": result,
            "mode": "legal"
        })
        
    except json.JSONDecodeError as e:
        return jsonify({
            "error": "Failed to parse AI response",
            "raw_response": response.choices[0].message.content if 'response' in dir() else None
        }), 500
    except Exception as e:
        # print error for debug
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/analyze/sustainability', methods=['POST'])
def analyze_sustainability():
    """Analyze receipt or habits for sustainability"""
    if not client:
        return jsonify({"error": "Groq API key not configured"}), 500
    
    try:
        # Get language preference
        language = request.form.get('language', 'English')

        messages_content = []
        messages_content.append({"type": "text", "text": get_sustainability_prompt(language)})
        
        has_image = False
        
        # Check if file was uploaded
        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']
            
            if not allowed_file(file.filename):
                return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
            
            file_content = file.read()
            file_extension = file.filename.rsplit('.', 1)[1].lower()
            
            # Handle PDF vs Image
            if file_extension == 'pdf':
                image_data = convert_pdf_to_image(file_content)
                mime_type = 'image/png'
                image_base64 = base64.b64encode(image_data).decode('utf-8')
            else:
                mime_type = f'image/{file_extension}'
                if file_extension == 'jpg':
                    mime_type = 'image/jpeg'
                image_base64 = base64.b64encode(file_content).decode('utf-8')

            messages_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{image_base64}"
                }
            })
            has_image = True
        
        # Check for text input
        text_input = request.form.get('text', '')
        if text_input:
            messages_content.append({"type": "text", "text": f"\nUser's habits/items to analyze: {text_input}"})
        
        if len(messages_content) == 1:
            return jsonify({"error": "Please provide either a file or text description"}), 400
        
        # Choose model based on input type
        model = VISION_MODEL if has_image else TEXT_MODEL
        
        # Call Groq API
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": messages_content
                }
            ],
            max_tokens=1500,
            temperature=0.3
        )
        
        # Parse the JSON response
        response_text = response.choices[0].message.content.strip()
        if response_text.startswith('```'):
            response_text = response_text.split('\n', 1)[1]
            response_text = response_text.rsplit('```', 1)[0]
        if response_text.startswith('json'):
            response_text = response_text[4:].strip()
        
        result = json.loads(response_text)
        
        return jsonify({
            "success": True,
            "analysis": result,
            "mode": "sustainability"
        })
        
    except json.JSONDecodeError as e:
        return jsonify({
            "error": "Failed to parse AI response",
            "raw_response": response.choices[0].message.content if 'response' in dir() else None
        }), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/generate-rti', methods=['POST'])
def generate_rti():
    """Generate RTI template based on context"""
    if not client:
        return jsonify({"error": "Groq API key not configured"}), 500
    
    try:
        data = request.get_json()
        topic = data.get('topic', '')
        department = data.get('department', '')
        details = data.get('details', '')
        
        if not topic:
            return jsonify({"error": "Please provide a topic for the RTI"}), 400
        
        prompt = f'''Generate a formal RTI (Right to Information) application in Hindi for an Indian citizen.

Topic: {topic}
Department: {department if department else 'Appropriate government department'}
Additional Details: {details if details else 'None provided'}

Return ONLY valid JSON in this format:
{{
  "rti_application": "The complete RTI application text in Hindi with proper formatting",
  "department_address": "Where to send this RTI",
  "fee_details": "RTI fee information (usually ₹10)",
  "submission_modes": ["Online portal", "By post", "In person"],
  "expected_response_time": "30 days as per RTI Act",
  "tips": ["Tip 1 for better response", "Tip 2"]
}}'''
        
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.3
        )
        
        response_text = response.choices[0].message.content.strip()
        if response_text.startswith('```'):
            response_text = response_text.split('\n', 1)[1]
            response_text = response_text.rsplit('```', 1)[0]
        if response_text.startswith('json'):
            response_text = response_text[4:].strip()
        
        result = json.loads(response_text)
        
        return jsonify({
            "success": True,
            "rti": result
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/chat', methods=['POST'])
def chat():
    """Chat channel for follow-up questions"""
    if not client:
        return jsonify({"error": "Groq API key not configured"}), 500

    try:
        data = request.get_json()
        question = data.get('question')
        context = data.get('context', None) # Summary or previous analysis
        mode = data.get('mode', 'legal')
        language = data.get('language', 'English') # Get selected language

        if not question:
            return jsonify({"error": "Question is required"}), 400

        system_instruction = ""
        user_prompt = ""

        if mode == 'legal':
            if context:
                system_instruction = f"You are a helpful legal assistant. Answer the user's question based on the document context provided. Respond in {language}."
                user_prompt = f"Context from analysis:\n{json.dumps(context, indent=2)}\n\nUser Question: {question}\n\nAnswer concisely and helpfully in {language}."
            else:
                system_instruction = f"You are a helpful Legal Advisor for Indian citizens. The user has NOT uploaded a document yet. Answer their general legal questions about Indian law, courts, or rights. Respond in {language}."
                user_prompt = f"User Question: {question}\n\nAnswer concisely and helpfully as a general legal advisor in {language}."
        else:
            # Sustainability
            if context:
                system_instruction = f"You are a sustainability expert. Answer the user's question about the environmental impact analysis provided. Respond in {language}."
                user_prompt = f"Context from analysis:\n{json.dumps(context, indent=2)}\n\nUser Question: {question}\n\nAnswer concisely and helpfully in {language}."
            else:
                system_instruction = f"You are a sustainability expert for Indian families. The user has NOT uploaded a receipt or habit yet. Answer their general questions about eco-friendly living, recycling, or carbon footprint in India. Respond in {language}."
                user_prompt = f"User Question: {question}\n\nAnswer concisely and helpfully as a general sustainability advisor in {language}."

        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=1000,
            temperature=0.5
        )

        answer = response.choices[0].message.content.strip()

        return jsonify({
            "success": True,
            "answer": answer
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("🚀 Starting Civic AI Copilot Backend (Groq - FREE!)...")
    print(f"📁 Upload folder: {os.path.abspath(UPLOAD_FOLDER)}")
    print(f"🤖 Groq configured: {GROQ_API_KEY is not None}")
    print(f"️ Vision Model: {VISION_MODEL}")
    print(f"📝 Text Model: {TEXT_MODEL}")
    app.run(debug=True, host='0.0.0.0', port=5000)
