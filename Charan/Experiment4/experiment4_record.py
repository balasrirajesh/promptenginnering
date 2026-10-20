"""
================================================================================
Experiment 4: Diagnosing Prompt Failures & Edge Cases
Unit I: Foundations of Prompt Engineering (Common Prompt Pitfalls & Remediation)
================================================================================
Aim:
    Craft vague or contradictory prompts, detect root-cause failure modes
    (ambiguity, missing context, opposing constraints), and synthesize structured
    prompt refinements with role framing and explicit output boundaries.
================================================================================
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Setup API & Environment
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-3.5-flash-lite")

# 2. Flawed Prompt with Opposing Constraints
flawed_prompt = (
    "Write an exhaustive, deeply technical explanation of quantum computing, "
    "but strictly under 15 words for a 4-year-old child."
)

# 3. Diagnostic Logic to Detect Failure Modes
def diagnose_prompt(prompt: str) -> list[str]:
    issues = []
    p = prompt.lower()
    # Check for opposing constraints
    if ("exhaustive" in p or "technical" in p) and ("under 15 words" in p or "child" in p):
        issues.append("Contradiction: Conflicting technical depth vs. extreme brevity")
    # Check for missing format
    if not any(k in p for k in ["format", "json", "bullet", "table", "schema", "sections"]):
        issues.append("Format Gap: Absence of explicit output structure or boundaries")
    return issues

# 4. Synthesized Engineered Prompt (Remediation)
refined_prompt = """You are an experienced quantum physics educator.
Explain quantum computing algorithms following this exact 3-part structure:
1. Analogy: A 1-sentence simple analogy accessible to a beginner.
2. Core Principles: 2 concise bullet points explaining Superposition and Entanglement.
3. Practical Application: A 1-sentence summary of its real-world significance.
Constraints: Under 120 words total."""

# 5. Execution Pipeline
def run_experiment():
    print("=" * 70)
    print("EXPERIMENT 4: Prompt Failure Diagnosis & Remediation")
    print("=" * 70)
    
    # Step A: Diagnose Flawed Prompt
    print(f"\n[1] FLAWED PROMPT:\n\"{flawed_prompt}\"")
    print("\n[2] DIAGNOSED FAILURE MODES:")
    for issue in diagnose_prompt(flawed_prompt):
        print(f"  • {issue}")
        
    # Step B: Baseline Generation
    print("\n[3] BASELINE OUTPUT (From Flawed Prompt):")
    print("-" * 70)
    baseline_output = model.generate_content(flawed_prompt).text.strip()
    print(baseline_output)
    print("-" * 70)
    
    # Step C: Refined Generation
    print(f"\n[4] REFINED ENGINEERED PROMPT:\n{refined_prompt}")
    print("\n[5] IMPROVED OUTPUT (From Refined Prompt):")
    print("-" * 70)
    refined_output = model.generate_content(refined_prompt).text.strip()
    print(refined_output)
    print("-" * 70)
    print("[VERDICT] Opposing constraints resolved via multi-tier role framing and schema.")

if __name__ == "__main__":
    run_experiment()
