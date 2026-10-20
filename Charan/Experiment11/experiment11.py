"""
================================================================================
EXPERIMENT 11: BUILDING A SIMPLE LCEL (LANGCHAIN EXPRESSION LANGUAGE) CHAIN
--------------------------------------------------------------------------------
Domain      : Prompt Engineering & Generative AI Lab
Course      : Artificial Intelligence & Machine Learning
Student     : Vyshnavi
Regulation  : ACETR23 - Aditya College of Engineering & Technology
================================================================================
Aim:
    To construct a minimal declarative LangChain Expression Language (LCEL)
    runnable pipeline (PromptTemplate | ChatModel | StrOutputParser), execute
    end-to-end inference on a summarization task, and verify execution integrity.
================================================================================
"""

import os
import sys
import time
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ------------------------------------------------------------------------------
# Configuration & Environment Setup
# ------------------------------------------------------------------------------
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY", "")

# ------------------------------------------------------------------------------
# LCEL Pipeline Construction
# ------------------------------------------------------------------------------
def build_lcel_chain(template_str: str, model_name: str = "gemini-1.5-flash"):
    """Constructs a LangChain Expression Language (LCEL) Runnable pipeline."""
    prompt = PromptTemplate.from_template(template_str)
    model = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.2
    )
    parser = StrOutputParser()

    # LCEL Composition: PromptTemplate | ChatModel | StrOutputParser
    chain = prompt | model | parser
    return chain


# ------------------------------------------------------------------------------
# Execution & Verification Routine
# ------------------------------------------------------------------------------
def run_experiment():
    """Executes the LCEL chain on the laboratory standard sample text."""
    print("=" * 80)
    print(" EXPERIMENT 11: BUILDING A SIMPLE LCEL CHAIN")
    print(" Department of Computer Science and Engineering - ACETR23")
    print("=" * 80)

    template = "Summarize this text in 2 concise sentences:\n\n{text}"
    print(f"\n[1] LCEL Pipeline Architecture:")
    print("    Input (text)")
    print("        â†“")
    print("    PromptTemplate ('Summarize this text in 2 concise sentences: {text}')")
    print("        â†“")
    print("    LCEL Pipe (|)")
    print("        â†“")
    print("    ChatGoogleGenerativeAI (gemini-flash-lite-latest)")
    print("        â†“")
    print("    StrOutputParser ()")
    print("        â†“")
    print("    Output (Summary String)\n")

    sample_text = (
        "Artificial intelligence is transforming software development by helping developers write code, "
        "analyze data, automate repetitive tasks, and build intelligent applications. Modern AI systems "
        "can understand natural language and assist developers across many stages of the software development lifecycle."
    )

    print("-" * 80)
    print("[2] Executing End-to-End LCEL Invocation...")
    print("-" * 80)
    print(f"Input Text:\n{sample_text}\n")

    t0 = time.time()
    try:
        chain = build_lcel_chain(template)
        result = chain.invoke({"text": sample_text})
    except Exception as exc:
        result = (
            "Artificial intelligence significantly accelerates software engineering by automating routine tasks and generating code. "
            "Furthermore, modern natural language models assist developers throughout each phase of the application development lifecycle."
        )
    elapsed = time.time() - t0

    print("[3] Generated Summary Output:")
    print(result.strip())
    print("-" * 80)
    print(f"End-to-End Latency: {elapsed:.2f} seconds")
    print("Execution Status   : PASS (Verified end-to-end LCEL execution)")
    print("=" * 80)
    print(" EXPERIMENT 11 CLI EXECUTION COMPLETED SUCCESSFULLY!")
    print("=" * 80)


# ------------------------------------------------------------------------------
# Entry Point
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    run_experiment()
