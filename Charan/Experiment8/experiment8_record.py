"""
Experiment 8: Structured Format Prompting (Markdown Tables & Bullet Lists)
Aim: Instruct the model to output structured tables and bullet lists, and verify output format.
"""
import google.generativeai as genai
import re

# 1. Setup API key and resilient model
genai.configure(api_key="YOUR_API_KEY")
model = genai.GenerativeModel("gemini-3.5-flash-lite")

# 2. Structured Prompt with explicit schema
prompt = """
List three benefits of daily exercise in a Markdown table with columns:
"Benefit" and "Description".
Also include a bulleted list of 3 tips to get started.
"""

# 3. Model Generation
response = model.generate_content(prompt)
print("=== Model Output ===\n", response.text)

# 4. Format Verification
has_table = bool(re.search(r"\|.*Benefit.*\|.*Description.*\|", response.text))
bullets = re.findall(r"(?:^|\n)\s*[\*\-•]\s+(.+)", response.text)

print("\n=== Validation ===")
print("Markdown Table Detected:", "PASS" if has_table else "FAIL")
print(f"Bullets Found: {len(bullets)} items (PASS)" if len(bullets) >= 3 else "FAIL")
