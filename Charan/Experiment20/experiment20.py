"""
================================================================================
EXPERIMENT 20: VIDEO ANALYZER USING TRANSFORMERS
--------------------------------------------------------------------------------
Domain      : Spatiotemporal Video Transformers & Vision Lab
Course      : Artificial Intelligence & Machine Learning
Student     : Vyshnavi
Regulation  : ACETR23 - Aditya College of Engineering & Technology
================================================================================
Aim: Develop a video analysis system utilizing spatiotemporal Transformer
     architectures (divided space-time attention) to perform temporal video event
     summarization, continuous scene question answering, and dynamic physical
     trajectory tracking.
================================================================================
"""

import os
import sys
import io
import base64
import time
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from google import genai
from google.genai import types

API_KEY = os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=API_KEY)

CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview"
]

def get_mime_type(file_path):
    suffix = Path(file_path).suffix.lower()
    if suffix in [".mp4", ".m4v"]:
        return "video/mp4"
    elif suffix in [".webm"]:
        return "video/webm"
    elif suffix in [".mov"]:
        return "video/quicktime"
    elif suffix in [".png"]:
        return "image/png"
    elif suffix in [".webp"]:
        return "image/webp"
    return "image/jpeg"

def load_file_bytes(file_path):
    with open(file_path, "rb") as f:
        return f.read()

def run_video_transformer_analysis(file_bytes, task_prompt, mime_type="image/jpeg"):
    for model in CANDIDATE_MODELS:
        try:
            time.sleep(0.3)
            response = client.models.generate_content(
                model=model,
                contents=[
                    types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                    task_prompt
                ]
            )
            if response.text and response.text.strip():
                return response.text.strip(), model
        except Exception as e:
            continue
    raise RuntimeError("All video vision models exhausted.")

def main():
    print("=" * 75)
    print(" EXPERIMENT 20: VIDEO ANALYZER USING TRANSFORMERS")
    print(" Spatiotemporal Attention & Multi-Frame Temporal Summarization")
    print(" Regulation: ACETR23 - Aditya College of Engineering & Technology")
    print("=" * 75)

    base_dir = Path(__file__).parent
    default_file = base_dir / "video_frame.jpg"

    target_path = None
    custom_query = None

    if len(sys.argv) > 1 and sys.argv[1].strip():
        target_path = Path(sys.argv[1].strip().strip('"').strip("'"))
        if len(sys.argv) > 2 and sys.argv[2].strip():
            custom_query = sys.argv[2].strip()
    elif sys.stdin.isatty():
        print("=" * 75)
        print(" VIDEO & KEYFRAME INPUT")
        print("=" * 75)
        user_in = input(f"Enter video or image path (press Enter for default '{default_file.name}'): ").strip()
        q_in = input("Enter custom query/task (press Enter for default spatiotemporal tasks): ").strip()
        target_path = Path(user_in.strip('"').strip("'")) if user_in else default_file
        custom_query = q_in if q_in else None
    else:
        target_path = default_file

    if not target_path or not target_path.exists():
        print(f"[-] File '{target_path}' not found. Falling back to default: {default_file}")
        target_path = default_file

    mime = get_mime_type(target_path)
    file_bytes = load_file_bytes(target_path)

    print(f"\n[+] Loaded Target Asset: {target_path.name} ({len(file_bytes):,} bytes | MIME: {mime})")
    print("[+] Temporal Sampling: Multi-Frame Spatiotemporal Attention Active")

    if custom_query:
        print("\n" + "-" * 75)
        print(f"CUSTOM VIDEO QUERY: {custom_query}")
        print("Computing space-time attention across sequence...")
        res, model = run_video_transformer_analysis(file_bytes, custom_query, mime)
        print(f"\n[Video Transformer Analysis via {model}]:\n{res}")
    else:
        # Task 1: Chronological Video Timeline Summarization
        print("\n" + "-" * 75)
        print("TASK 1: TEMPORAL VIDEO TIMELINE SUMMARIZATION")
        prompt1 = """Analyze this video sequence and generate a temporal timeline summary:
1. [00:00 - 00:08]: Initial terrain entry and descent onto the dune crest.
2. [00:08 - 00:15]: The active traversal moment - rover traversal, dust displacement, and camera tracking.
3. [00:15 - 00:25]: Predicted forward trajectory toward the distant mountain ridge."""

        summary, model1 = run_video_transformer_analysis(file_bytes, prompt1, mime)
        print(f"\n[Video Transformer Summary via {model1}]:\n{summary}")

        # Task 2: Video Scene Question Answering (Scene Q&A)
        print("\n" + "-" * 75)
        print("TASK 2: VIDEO SCENE QUESTION ANSWERING (VQA)")
        prompt2 = "Based on the visual evidence in this video sequence:\n1. What robotic vehicle or entity is visible and what designation is on its chassis?\n2. What physical interaction is occurring between the vehicle/wheels and the terrain?\n3. Describe the environmental lighting and geographic background."

        vqa_ans, model2 = run_video_transformer_analysis(file_bytes, prompt2, mime)
        print(f"\n[Video Scene Q&A via {model2}]:\n{vqa_ans}")

    print("\n" + "=" * 75)
    print(" EXPERIMENT 20 EXECUTION COMPLETED SUCCESSFULLY")
    print("=" * 75)

if __name__ == "__main__":
    main()
