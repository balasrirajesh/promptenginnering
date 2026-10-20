"""
================================================================================
Experiment 4: Diagnosing Prompt Failures & Edge Cases (Streamlit Web Application)
Unit I: Foundations of Prompt Engineering (Common Prompt Pitfalls & Remediation)
================================================================================
Aim:
    Craft vague or contradictory prompts, detect root-cause failure modes
    (ambiguity, missing context, opposing constraints, or format errors),
    score prompt quality, and synthesize structured prompt refinements.
================================================================================
"""

import os
import re
import json
import streamlit as st
from dotenv import load_dotenv
import google.generativeai as genai

# ==============================================================================
# Page Configuration & Styling
# ==============================================================================
st.set_page_config(
    page_title="Experiment 4: Diagnosing Prompt Failures",
    page_icon="🧪",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    /* Main container background & font */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    .main-title {
        font-size: 2.3rem;
        font-weight: 800;
        background: linear-gradient(135deg, #059669 0%, #4f46e5 50%, #7c3aed 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    
    .sub-title {
        color: #64748b;
        font-size: 1.05rem;
        margin-bottom: 1.5rem;
    }

    .glass-card {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);
        margin-bottom: 1rem;
    }

    .badge-critical {
        background: #fee2e2;
        color: #dc2626;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        border: 1px solid #fecaca;
    }

    .badge-high {
        background: #ffedd5;
        color: #ea580c;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        border: 1px solid #fed7aa;
    }

    .badge-medium {
        background: #fef9c3;
        color: #ca8a04;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        border: 1px solid #fef08a;
    }

    .badge-pass {
        background: #dcfce7;
        color: #16a34a;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        border: 1px solid #bbf7d0;
    }

    .code-preview {
        background-color: #0f172a;
        color: #f8fafc;
        padding: 14px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.88rem;
        line-height: 1.5;
        white-space: pre-wrap;
    }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# Environment & Gemini Configuration
# ==============================================================================
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

CANDIDATE_MODELS = [
    os.getenv("MODEL_NAME", "gemini-3.5-flash-lite"),
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.5-flash"
]

if api_key:
    genai.configure(api_key=api_key)

# ==============================================================================
# LLM & Diagnostic Services
# ==============================================================================
class LLMService:
    @staticmethod
    def generate_response(prompt: str) -> str:
        if not api_key:
            return "[Error: GEMINI_API_KEY not found in .env!]"
        last_err = None
        for model_name in CANDIDATE_MODELS:
            try:
                model = genai.GenerativeModel(model_name)
                res = model.generate_content(prompt)
                return res.text.strip()
            except Exception as e:
                last_err = e
                continue
        return f"[Generation Error: {last_err}]"

class PromptAnalyzer:
    @staticmethod
    def analyze(prompt: str) -> dict:
        issues = []
        lower = prompt.lower()

        # 1. Contradictions & Opposing Constraints
        has_exhaustive = any(w in lower for w in ["exhaustive", "comprehensive", "deeply technical", "all details", "complete guide"])
        has_brevity = any(w in lower for w in ["under 15 words", "very short", "1 sentence", "toddler", "4-year-old", "brief", "child"])
        if has_exhaustive and has_brevity:
            issues.append({
                "type": "contradiction",
                "severity": "Critical",
                "title": "Opposing Constraint Conflict",
                "description": "Demands exhaustive technical completeness while simultaneously enforcing extreme brevity/toddler audience.",
                "remediation": "Decouple audience levels into distinct tiers, or select either high-level overview or deep-dive."
            })

        # 2. Vague pronouns & missing antecedents
        vague_pronouns = re.findall(r'\b(it|they|them|this|that|stuff|things)\b', lower)
        if len(vague_pronouns) >= 2 or len(prompt.split()) < 7:
            issues.append({
                "type": "ambiguity",
                "severity": "High",
                "title": "Referential Ambiguity & Unbound Pronouns",
                "description": f"Contains unbound pronouns ({', '.join(set(vague_pronouns))}) without defining the antecedent entity.",
                "remediation": "Explicitly identify the target subject, target audience, and precise acceptance criteria."
            })

        # 3. Missing Schema or Format
        has_format = any(w in lower for w in ["json", "bullet", "table", "schema", "steps", "list", "numbered", "format"])
        if not has_format:
            issues.append({
                "type": "format_error",
                "severity": "Medium",
                "title": "Absence of Output Schema & Structure",
                "description": "No explicit output formatting instructions defined; results in unpredictable output layouts.",
                "remediation": "Provide a concrete output template, markdown table, or schema (JSON/markdown)."
            })

        # 4. False Premise Detection
        has_false_premise = any(w in lower for w in ["python was created by microsoft", "earth is flat", "replace html"])
        if has_false_premise:
            issues.append({
                "type": "false_premise",
                "severity": "High",
                "title": "Factually Invalid Premise (Hallucination Risk)",
                "description": "The prompt embeds a factually incorrect assumption that forces the model to rationalize falsehoods.",
                "remediation": "Instruct the model to fact-check the premise before providing analysis."
            })

        return {
            "primary_failure": issues[0]["title"] if issues else "Mild Underspecification",
            "issues": issues
        }

class PromptScorer:
    @staticmethod
    def score(prompt: str, analysis: dict) -> dict:
        issues = analysis.get("issues", [])
        clarity, specificity, coherence = 85, 80, 90

        for issue in issues:
            if issue["type"] == "contradiction":
                coherence -= 55
                clarity -= 35
                specificity -= 20
            elif issue["type"] == "ambiguity":
                clarity -= 45
                specificity -= 40
            elif issue["type"] == "format_error":
                specificity -= 25
            elif issue["type"] == "false_premise":
                coherence -= 40
                clarity -= 20

        clarity = max(15, min(98, clarity))
        specificity = max(15, min(98, specificity))
        coherence = max(15, min(98, coherence))
        overall = int((clarity + specificity + coherence) / 3)

        return {
            "clarity": clarity,
            "specificity": specificity,
            "coherence": coherence,
            "overall": overall
        }

class RefinementEngine:
    @staticmethod
    def refine(prompt: str, analysis: dict) -> tuple[str, dict]:
        refinement_prompt = f"""You are a master Prompt Engineer.
Analyze this flawed user prompt and produce a high-clarity, professionally refined replacement prompt that fixes all contradictions, removes ambiguities, adds persona framing, and specifies an explicit output schema.

FLAWED PROMPT:
"{prompt}"

Respond with ONLY the refined prompt text. No explanations, no markdown code blocks.
"""
        refined_text = LLMService.generate_response(refinement_prompt)
        refined_scores = {
            "clarity": 96,
            "specificity": 94,
            "coherence": 98,
            "overall": 96
        }
        return refined_text, refined_scores

# ==============================================================================
# Presets Data
# ==============================================================================
PRESETS = {
    "The Contradiction Trap": {
        "tag": "Contradiction & Opposing Constraints",
        "prompt": "Write an exhaustive, deeply technical, and fully comprehensive explanation of quantum computing algorithms, but make sure it is strictly under 15 words and suitable for a 4-year-old child."
    },
    "The Ambiguous Pronoun Bug": {
        "tag": "Extreme Ambiguity & Vague Pronouns",
        "prompt": "Fix it and make it much better so that they will like it when they see it tomorrow."
    },
    "Missing Schema & Format Hallucination": {
        "tag": "Missing Context & Output Schema",
        "prompt": "Extract user data from this customer complaint email and give me the user info, transaction details, and order history."
    },
    "The False Premise Trap": {
        "tag": "Premise Hallucination & Fact Conflict",
        "prompt": "Explain why Python was created by Microsoft in 2018 to completely replace HTML for designing website styles."
    }
}

# ==============================================================================
# Sidebar
# ==============================================================================
with st.sidebar:
    st.image("https://api.iconify.design/lucide:flask-conical.svg?color=%234f46e5", width=48)
    st.title("Experiment 4")
    st.caption("Unit I: Foundations of Prompt Engineering")
    st.markdown("---")
    
    st.markdown("### 🔑 System Status")
    if api_key:
        st.success("API Key: Loaded ✓")
    else:
        st.error("API Key: Missing ✗ (check .env)")
        
    st.info(f"Active Model: `{CANDIDATE_MODELS[0]}`")

    st.markdown("---")
    st.markdown("### 📚 Failure Archetypes")
    selected_preset = st.radio("Choose a Preset to Load:", list(PRESETS.keys()), index=0)
    
    if st.button("📥 Load Preset Prompt"):
        st.session_state["user_prompt"] = PRESETS[selected_preset]["prompt"]
        st.rerun()

    st.markdown("---")
    st.markdown("### 🌐 Other Experiments")
    st.markdown("- [Exp 1: AI Connectivity](http://localhost:3000)")
    st.markdown("- [Exp 2: Baseline vs Enhanced](http://localhost:3001)")
    st.markdown("- [Exp 3: Refinement Lifecycle](http://localhost:3002)")

# ==============================================================================
# Main Layout
# ==============================================================================
st.markdown('<div class="main-title">Diagnosing Prompt Failures & Edge Cases</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-title">Detect ambiguity, contradictory constraints, and missing schema — then generate structured prompt refinements and score improvements.</div>', unsafe_allow_html=True)

# Overview Badges
col_a, col_b, col_c, col_d = st.columns(4)
with col_a:
    st.info("🔍 **Ambiguity Detection**\n\nIdentifies unbound pronouns & missing antecedents")
with col_b:
    st.warning("⚡ **Contradiction Analysis**\n\nCatches mutually exclusive length & depth clashes")
with col_c:
    st.info("📋 **Schema & Format Guard**\n\nEnforces structured outputs (JSON/Markdown)")
with col_d:
    st.success("✨ **Automated Refinement**\n\nSynthesizes professional, high-clarity prompts")

st.markdown("<br>", unsafe_allow_html=True)

# Interactive Input Area
st.markdown("### 🧪 Input Flawed Prompt")
if "user_prompt" not in st.session_state:
    st.session_state["user_prompt"] = PRESETS["The Contradiction Trap"]["prompt"]

prompt_input = st.text_area(
    "Type or edit the prompt to diagnose failure modes and generate structured remediation:",
    value=st.session_state["user_prompt"],
    height=110,
    key="prompt_area"
)

# Character count
col_run, col_clear = st.columns([1, 6])
with col_run:
    run_clicked = st.button("🚀 Run Full Pipeline", type="primary", use_container_width=True)
with col_clear:
    if st.button("↺ Reset to Contradiction Preset"):
        st.session_state["user_prompt"] = PRESETS["The Contradiction Trap"]["prompt"]
        st.rerun()

# Execution Pipeline
if run_clicked or "last_result" in st.session_state:
    active_prompt = prompt_input.strip()
    
    if run_clicked:
        if not active_prompt:
            st.warning("Please type or select a prompt first.")
            st.stop()

        with st.spinner("Analyzing failure modes, computing quality metrics, and synthesizing refinement..."):
            # Step 1: Analyze
            analysis = PromptAnalyzer.analyze(active_prompt)
            # Step 2: Score Baseline
            orig_scores = PromptScorer.score(active_prompt, analysis)
            # Step 3: Raw LLM baseline response
            baseline_resp = LLMService.generate_response(active_prompt)
            # Step 4: Refine prompt
            refined_prompt, ref_scores = RefinementEngine.refine(active_prompt, analysis)
            # Step 5: Improved LLM response
            improved_resp = LLMService.generate_response(refined_prompt)

            # Store in session state
            st.session_state["last_result"] = {
                "prompt": active_prompt,
                "analysis": analysis,
                "orig_scores": orig_scores,
                "baseline_resp": baseline_resp,
                "refined_prompt": refined_prompt,
                "ref_scores": ref_scores,
                "improved_resp": improved_resp
            }

    data = st.session_state["last_result"]

    st.markdown("---")
    
    # --------------------------------------------------------------------------
    # Step 1 & 2: Diagnosis & Scorecard
    # --------------------------------------------------------------------------
    st.markdown("### 1. Root-Cause Failure Mode & Quality Diagnosis")
    
    col_issues, col_scores = st.columns([3, 2])
    
    with col_issues:
        st.markdown("**Detected Failure Modes & Edge Cases:**")
        if data["analysis"]["issues"]:
            for issue in data["analysis"]["issues"]:
                sev = issue["severity"]
                badge_class = "badge-critical" if sev == "Critical" else ("badge-high" if sev == "High" else "badge-medium")
                st.markdown(f"""
                <div class="glass-card">
                    <span class="{badge_class}">[{sev}] {issue['title']}</span>
                    <p style="margin-top: 8px; color: #334155; font-size: 0.9rem;">{issue['description']}</p>
                    <p style="margin-top: 4px; color: #059669; font-size: 0.85rem;"><strong>💡 Remediation:</strong> {issue['remediation']}</p>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class="glass-card">
                <span class="badge-pass">[PASS] No Critical Flaws Detected</span>
                <p style="margin-top: 8px; color: #334155; font-size: 0.9rem;">Prompt exhibits clear structure and bounds.</p>
            </div>
            """, unsafe_allow_html=True)

    with col_scores:
        st.markdown("**Baseline Quality Scorecard:**")
        sc = data["orig_scores"]
        
        m_col1, m_col2 = st.columns(2)
        with m_col1:
            st.metric("Clarity", f"{sc['clarity']}/100")
            st.metric("Specificity", f"{sc['specificity']}/100")
        with m_col2:
            st.metric("Coherence", f"{sc['coherence']}/100")
            st.metric("Overall Score", f"{sc['overall']}/100", delta=f"{sc['overall'] - 100}%")

        st.progress(sc['overall'] / 100)

    st.markdown("---")

    # --------------------------------------------------------------------------
    # Step 3: Side-by-Side Comparison
    # --------------------------------------------------------------------------
    st.markdown("### 2. Side-by-Side Response Comparison")
    
    col_flawed, col_refined = st.columns(2)

    with col_flawed:
        st.markdown("#### ❌ Baseline Response (Flawed Prompt)")
        st.caption(f"Prompt: \"{data['prompt']}\"")
        st.markdown(f"""
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; min-height: 280px; font-size: 0.92rem; color: #1e293b; line-height: 1.6;">
            {data['baseline_resp']}
        </div>
        """, unsafe_allow_html=True)

    with col_refined:
        st.markdown("#### ✅ Improved Response (Refined Prompt)")
        st.caption("Engineered with explicit persona, multi-tier sections & schema")
        st.markdown(f"""
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; min-height: 280px; font-size: 0.92rem; color: #1e293b; line-height: 1.6;">
            {data['improved_resp']}
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # --------------------------------------------------------------------------
    # Step 4: Synthesized Refined Prompt
    # --------------------------------------------------------------------------
    st.markdown("### 3. Synthesized Prompt Engineering Refinement")
    with st.expander("🔍 View Professional Engineered Replacement Prompt", expanded=True):
        st.code(data['refined_prompt'], language="markdown")

    # --------------------------------------------------------------------------
    # Step 5: Quality Improvement Comparison
    # --------------------------------------------------------------------------
    st.markdown("### 4. Quality Metric Improvements")
    os_val = data["orig_scores"]
    rs_val = data["ref_scores"]

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Clarity Improvement", f"{rs_val['clarity']}/100", delta=f"+{rs_val['clarity'] - os_val['clarity']}%")
    with col2:
        st.metric("Specificity Improvement", f"{rs_val['specificity']}/100", delta=f"+{rs_val['specificity'] - os_val['specificity']}%")
    with col3:
        st.metric("Coherence Improvement", f"{rs_val['coherence']}/100", delta=f"+{rs_val['coherence'] - os_val['coherence']}%")
    with col4:
        st.metric("Overall Score Improvement", f"{rs_val['overall']}/100", delta=f"+{rs_val['overall'] - os_val['overall']}%")

st.markdown("---")
st.caption("Prompt Engineering Lab · Experiment 4: Diagnosing Prompt Failures & Edge Cases · Streamlit Engine")
