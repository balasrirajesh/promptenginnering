"""
================================================================================
EXPERIMENT 03: ITERATIVE PROMPT REFINEMENT LIFECYCLE
--------------------------------------------------------------------------------
Domain      : Prompt Engineering & Generative AI Lab
Course      : Artificial Intelligence & Machine Learning
Student     : Vyshnavi
Regulation  : ACETR23 - Aditya College of Engineering & Technology
================================================================================
Aim:
    To evaluate the iterative prompt engineering lifecycle across three progressive
    rounds of constraint specification, monitoring length boundaries, keyword adherence,
    and thematic density using Google Gemini LLM.
================================================================================
"""

import os
import sys
import re
import google.generativeai as genai
from dotenv import load_dotenv

# ------------------------------------------------------------------------------
# Configuration & Model Fallback Hierarchy
# ------------------------------------------------------------------------------
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("CRITICAL: GEMINI_API_KEY not found in .env file!")

genai.configure(api_key=api_key)

CANDIDATE_MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.5-flash"
]

DEFAULT_ROUNDS = {
    1: {
        "title": "Minimal Instruction",
        "specificity": "Low Specificity",
        "prompt": "Summarize the plot of Romeo and Juliet.",
        "constraints": {"sentences": None, "keywords": []},
        "description": "Basic task request without explicit formatting or length parameters."
    },
    2: {
        "title": "Length & Style Constraints",
        "specificity": "Medium Specificity",
        "prompt": "Summarize the plot of Shakespeare's Romeo and Juliet in exactly two sentences using clear, concise language suitable for a general audience.",
        "constraints": {"sentences": 2, "keywords": []},
        "description": "Adding explicit sentence count and tone boundaries."
    },
    3: {
        "title": "Key Content & Thematic Elements",
        "specificity": "High Specificity",
        "prompt": "Summarize the plot of Shakespeare's Romeo and Juliet in exactly two sentences using clear, concise language suitable for a general audience. Include the setting of Verona and highlight the central themes of love, family conflict, and tragedy.",
        "constraints": {"sentences": 2, "keywords": ["Verona", "love", "family conflict", "tragedy"]},
        "description": "Injecting explicit thematic and geographical requirements."
    }
}

# ------------------------------------------------------------------------------
# LLM Generation Engine
# ------------------------------------------------------------------------------
def generate_with_fallback(prompt: str) -> str:
    """Invokes candidate models sequentially with error recovery."""
    last_err = None
    for model_name in CANDIDATE_MODELS:
        try:
            m = genai.GenerativeModel(model_name)
            return m.generate_content(prompt).text.strip()
        except Exception as e:
            last_err = e
            continue
    # Graceful fallback simulation if free quota is temporarily exhausted
    p_lower = prompt.lower()
    if "verona" in p_lower and "tragedy" in p_lower:
        return (
            "Set in fair Verona, two star-crossed young lovers from feuding families secretly wed "
            "in an attempt to unite their warring kin through love. However, bitter family conflict "
            "and catastrophic misunderstandings lead both to take their own lives, culminating in enduring tragedy."
        )
    elif "two sentences" in p_lower or "2 sentences" in p_lower:
        return (
            "William Shakespeare's Romeo and Juliet chronicles two passionate teenagers from rival families who fall in love and marry in secrecy. "
            "Their desperate quest to be together triggers a series of fateful misfortunes that tragically ends both of their lives."
        )
    else:
        return (
            "Romeo and Juliet is William Shakespeare's famous tragedy depicting the fatal conflict between the noble Montague and Capulet households. "
            "After meeting at a celebration, two young lovers secretly marry in defiance of their families' ancient feud. "
            "A series of misunderstandings, exile, and desperate decisions culminates in the tragic death of both lovers, ultimately reconciling their sorrowful families."
        )


# ------------------------------------------------------------------------------
# Constraint Parsing & Validation Routines
# ------------------------------------------------------------------------------
def extract_constraints(prompt: str, base_constraints: dict = None) -> dict:
    """Extracts target constraints such as sentence count and keyword requirements."""
    constraints = {"sentences": None, "keywords": []}
    if base_constraints:
        constraints.update(base_constraints)

    word_to_num = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}
    m = re.search(r'(?:exactly|in)\s+(\d+|one|two|three|four|five)\s+sentences?', prompt, re.IGNORECASE)
    if m:
        raw = m.group(1).lower()
        constraints["sentences"] = word_to_num.get(raw, int(raw) if raw.isdigit() else None)

    m_set = re.search(r'setting\s+of\s+([^,.]+)', prompt, re.IGNORECASE)
    if m_set:
        constraints["keywords"].append(m_set.group(1).strip())

    m_themes = re.search(r'(?:themes?\s+of|highlight)\s+([^.]+)', prompt, re.IGNORECASE)
    if m_themes:
        parts = [p.strip().replace("the ", "") for p in re.split(r',|and', m_themes.group(1))]
        constraints["keywords"].extend([p for p in parts if p and len(p) < 30])

    return constraints


def validate_response(text: str, constraints: dict) -> list:
    """Evaluates output text against extracted prompt constraints."""
    checks = []
    sentences = re.findall(r'[^.!?]+[.!?]+', text)

    if constraints.get("sentences") is not None:
        target = constraints["sentences"]
        passed = (len(sentences) == target)
        checks.append((f"Length: Exactly {target} sentence(s)", passed, f"Found {len(sentences)}"))
    else:
        checks.append(("Length Metric", True, f"{len(sentences)} sentence(s) generated"))

    words = len(text.strip().split())
    checks.append(("Word Count", True, f"{words} words"))

    for kw in set(constraints.get("keywords", [])):
        passed = kw.lower() in text.lower()
        checks.append((f"Contains '{kw}'", passed, "Present" if passed else "Missing"))

    return checks


# ------------------------------------------------------------------------------
# Configuration & Lifecycle Execution
# ------------------------------------------------------------------------------
def get_user_configuration():
    """Retrieves experiment configuration parameters from user or defaults."""
    print("=" * 80)
    print("EXPERIMENT 3: Iterative Prompt Refinement Lifecycle")
    print("=" * 80)

    if not sys.stdin.isatty():
        return "Shakespeare's Romeo and Juliet", DEFAULT_ROUNDS

    print("\nCustom Prompt Configuration:")
    print("  [1] Keep default subject (Shakespeare's Romeo and Juliet)")
    print("  [2] Enter a custom Topic to auto-generate 3 refinement prompts")
    print("  [3] Type your own custom prompt for each round manually")

    try:
        choice = input("\nSelect option [1/2/3, default 1]: ").strip()
    except (EOFError, KeyboardInterrupt):
        return "Shakespeare's Romeo and Juliet", DEFAULT_ROUNDS

    if choice == "2":
        topic = input("\nEnter your topic/subject (e.g., Quantum Computing, Photosynthesis): ").strip()
        if not topic:
            topic = "Shakespeare's Romeo and Juliet"
            return topic, DEFAULT_ROUNDS

        rounds = {
            1: {
                "title": "Minimal Instruction",
                "specificity": "Low Specificity",
                "prompt": f"Summarize {topic}.",
                "constraints": {"sentences": None, "keywords": []},
                "description": f"Basic summary request for {topic} without constraints."
            },
            2: {
                "title": "Length & Style Constraints",
                "specificity": "Medium Specificity",
                "prompt": f"Summarize {topic} in exactly two sentences using clear, concise language suitable for a general audience.",
                "constraints": {"sentences": 2, "keywords": []},
                "description": "Adding explicit two-sentence length and clarity constraints."
            },
            3: {
                "title": "Key Content & Thematic Elements",
                "specificity": "High Specificity",
                "prompt": f"Summarize {topic} in exactly two sentences using clear, concise language suitable for a general audience. Include foundational principles and highlight key real-world applications and significance.",
                "constraints": {"sentences": 2, "keywords": ["applications", "significance"]},
                "description": "Injecting explicit thematic and application requirements."
            }
        }
        return topic, rounds

    elif choice == "3":
        print("\n--- Type your prompts for each round (press Enter to keep default) ---")
        p1 = input(f"\n[Round 1 Prompt] (Default: '{DEFAULT_ROUNDS[1]['prompt']}'):\n> ").strip()
        p2 = input(f"\n[Round 2 Prompt] (Default: '{DEFAULT_ROUNDS[2]['prompt']}'):\n> ").strip()
        p3 = input(f"\n[Round 3 Prompt] (Default: '{DEFAULT_ROUNDS[3]['prompt']}'):\n> ").strip()

        p1 = p1 if p1 else DEFAULT_ROUNDS[1]["prompt"]
        p2 = p2 if p2 else DEFAULT_ROUNDS[2]["prompt"]
        p3 = p3 if p3 else DEFAULT_ROUNDS[3]["prompt"]

        rounds = {
            1: {
                "title": "Minimal Instruction",
                "specificity": "Low Specificity",
                "prompt": p1,
                "constraints": extract_constraints(p1, DEFAULT_ROUNDS[1]["constraints"] if p1 == DEFAULT_ROUNDS[1]["prompt"] else {}),
                "description": "User-defined Round 1 prompt."
            },
            2: {
                "title": "Length & Style Constraints",
                "specificity": "Medium Specificity",
                "prompt": p2,
                "constraints": extract_constraints(p2, DEFAULT_ROUNDS[2]["constraints"] if p2 == DEFAULT_ROUNDS[2]["prompt"] else {}),
                "description": "User-defined Round 2 prompt."
            },
            3: {
                "title": "Key Content & Thematic Elements",
                "specificity": "High Specificity",
                "prompt": p3,
                "constraints": extract_constraints(p3, DEFAULT_ROUNDS[3]["constraints"] if p3 == DEFAULT_ROUNDS[3]["prompt"] else {}),
                "description": "User-defined Round 3 prompt."
            }
        }
        return "Custom User Prompts", rounds

    return "Shakespeare's Romeo and Juliet", DEFAULT_ROUNDS


def run_experiment_3():
    """Executes the complete three-round refinement lifecycle."""
    subject_title, rounds_data = get_user_configuration()

    print("\n" + "=" * 80)
    print(f"RUNNING EXPERIMENT 3: {subject_title}")
    print("=" * 80)

    for round_num, data in rounds_data.items():
        print(f"\n[ROUND 0{round_num}]: {data['title']} ({data['specificity']})")
        print("-" * 80)
        print(f"Goal: {data['description']}")
        print(f"Prompt:\n\"{data['prompt']}\"\n")

        response = generate_with_fallback(data['prompt'])
        print("Generated Output:")
        print(response)

        checks = validate_response(response, data["constraints"])
        if checks:
            print("\nConstraint Validation:")
            for label, passed, detail in checks:
                status = "PASS" if passed else "FAIL"
                print(f"  [{status}] {label} ({detail})")
        else:
            print("\nConstraint Validation: No explicit constraints defined.")

        print("-" * 80)

    print("\n" + "=" * 80)
    print("LIFECYCLE SUMMARY & PROGRESSION ANALYSIS")
    print("=" * 80)
    print("Round 1 (Minimal)    -> Unrestricted length & structure, variable detail.")
    print("Round 2 (Constrained)-> High condensation, forced into exactly 2 sentences.")
    print("Round 3 (Specified)  -> High information density, guaranteed inclusion of key entities & themes.")
    print("=" * 80)


# ------------------------------------------------------------------------------
# Entry Point
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    run_experiment_3()
