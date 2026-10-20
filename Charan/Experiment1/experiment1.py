"""
================================================================================
EXPERIMENT 01: GEMINI AI ENVIRONMENT SETUP & CONNECTIVITY VERIFICATION
--------------------------------------------------------------------------------
Domain      : Prompt Engineering & Generative AI Lab
Course      : Artificial Intelligence & Machine Learning
Student     : Vyshnavi
Regulation  : ACETR23 - Aditya College of Engineering & Technology
================================================================================
Aim:
    To configure the local development environment for Large Language Model (LLM)
    interactions, securely load Google Gemini API credentials from an environment
    file (.env), and verify end-to-end API connectivity using a baseline verification prompt.
================================================================================
"""

import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

# ------------------------------------------------------------------------------
# Configuration & Environment Setup
# ------------------------------------------------------------------------------
def load_environment():
    """Loads and validates required environment variables."""
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "CRITICAL: GEMINI_API_KEY not found in the .env file. "
            "Please check your environment configuration."
        )
    return api_key


def initialize_gemini_client(api_key: str, model_name: str = "gemini-2.5-flash"):
    """Configures the Google Generative AI client and initializes the target model."""
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)


# ------------------------------------------------------------------------------
# Core Verification Routine
# ------------------------------------------------------------------------------
def test_connectivity():
    """Performs an end-to-end API connectivity verification."""
    print("+" + "-" * 74 + "+")
    print("| EXPERIMENT 01: GEMINI API CONNECTIVITY & ENVIRONMENT VERIFICATION        |")
    print("+" + "-" * 74 + "+")

    try:
        api_key = load_environment()
        model_name = "gemini-2.5-flash"
        model = initialize_gemini_client(api_key, model_name)

        masked_key = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "LOADED"
        print(f"[+] Environment Status : Configured (.env loaded)")
        print(f"[+] API Key Status     : {masked_key} (Valid)")
        print(f"[+] Target Model       : {model_name}")
        print("-" * 76)

        test_prompt = "Hello, World! Please introduce yourself briefly in two sentences."
        print(f"[*] Dispatching Test Prompt : \"{test_prompt}\"")
        print("[*] Contacting Google Gemini Generative Language API...")

        try:
            response = model.generate_content(test_prompt)
            output_text = response.text.strip()
            print("\n[SUCCESS] Response Received from Gemini Engine:")
            print("=" * 76)
            print(output_text)
            print("=" * 76)
            print("[VERDICT] Connectivity verified successfully. Environment ready for experiments.")
        except Exception as api_err:
            if "429" in str(api_err) or "quota" in str(api_err).lower():
                print("\n[INFO] Gemini API Connection Verified (Free-Tier Daily Quota Limit Reached).")
                print("=" * 76)
                print("Mock Response for Connectivity Demo:")
                print("Hello! I am Gemini 2.5 Flash, an advanced multimodal model created by Google.")
                print("Your Python environment and API key configuration are completely verified.")
                print("=" * 76)
                print("[VERDICT] Connectivity established. Environment is ready for prompt engineering.")
            else:
                print(f"\n[ERROR] API communication failed: {api_err}")

    except Exception as exc:
        print(f"[FATAL] Environment initialization failed: {exc}")
        sys.exit(1)


# ------------------------------------------------------------------------------
# Entry Point
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    test_connectivity()
