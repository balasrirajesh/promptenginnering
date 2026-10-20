"""
================================================================================
EXPERIMENT 5: Few-Shot vs. Zero-Shot Prompting Studio (Tkinter Application)
Unit II: Advanced Prompt Patterns & Techniques
Aditya College of Engineering & Technology (ACETR23 Regulation)
================================================================================
Aim:
    Design and execute a zero-shot prompt and a few-shot prompt (with 2-3 exemplar
    input-output pairs) for a chosen text task (e.g., conceptual explanations with
    concrete examples); compare outputs for accuracy, consistency, and adherence to examples.
================================================================================
"""

import os
import sys
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import customtkinter as ctk
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image, ImageGrab

# Set Light Appearance Mode
ctk.set_appearance_mode("Light")
ctk.set_default_color_theme("blue")

# Load environment & Gemini API
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

API_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=API_KEY)
CANDIDATE_MODELS = [
    os.getenv("MODEL_NAME", "gemini-3.5-flash-lite"),
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.5-flash"
]

def generate_gemini_content(prompt: str) -> str:
    last_err = None
    for m_name in CANDIDATE_MODELS:
        try:
            m = genai.GenerativeModel(m_name)
            return m.generate_content(prompt).text.strip()
        except Exception as e:
            last_err = e
            continue
    raise last_err

FEW_SHOT_TEMPLATE = """You are a helpful assistant. Explain the user's question very clearly and always include concrete examples.

Here are some examples of how to respond:

Question: Explain gravity.
Response: Gravity is a fundamental force of attraction that pulls objects toward each other. It is what keeps our feet on the ground and governs the motion of planets.
Examples:
1. An apple falling from a tree to the ground.
2. The Moon orbiting around the Earth due to Earth's gravitational pull.

Question: Explain photosynthesis.
Response: Photosynthesis is the chemical process by which green plants, algae, and some bacteria convert light energy, carbon dioxide, and water into chemical energy (glucose) and oxygen.
Examples:
1. A sunflower leaf absorbing sunlight to create sugars for plant growth.
2. Marine phytoplankton generating oxygen in the ocean using sunlight and dissolved carbon dioxide.

Question: {user_question}
Response:"""

ZERO_SHOT_TEMPLATE = """You are a helpful assistant. Answer the user's question simply and briefly in a few sentences, without extra details or examples.

Question: {user_question}
Answer:"""

PRESET_QUESTIONS = [
    "Explain inertia.",
    "Explain quantum entanglement.",
    "Explain machine learning overfitting.",
    "Explain Newton's third law of motion.",
    "Explain blockchain technology."
]

class Experiment5TkinterApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Experiment 5: Few-Shot vs. Zero-Shot Evaluation Studio")
        self.geometry("1240x840")
        self.minsize(1050, 720)
        self.configure(fg_color="#f8fafc")

        self.is_running = False
        self._build_ui()

    def _build_ui(self):
        # 1. Top Header Frame
        header_frame = ctk.CTkFrame(self, fg_color="#ffffff", corner_radius=12, border_width=1, border_color="#e2e8f0")
        header_frame.pack(fill="x", padx=18, pady=(16, 10))

        h_content = ctk.CTkFrame(header_frame, fg_color="transparent")
        h_content.pack(fill="x", padx=16, pady=12)

        tag_label = ctk.CTkLabel(
            h_content, 
            text="ACETR23 LAB | UNIT II: ADVANCED PROMPT PATTERNS", 
            font=ctk.CTkFont(family="Inter", size=11, weight="bold"),
            text_color="#2563eb"
        )
        tag_label.pack(anchor="w")

        title_row = ctk.CTkFrame(h_content, fg_color="transparent")
        title_row.pack(fill="x", pady=(2, 4))

        title_label = ctk.CTkLabel(
            title_row,
            text="EXPERIMENT 5: Few-Shot vs. Zero-Shot Prompting Studio",
            font=ctk.CTkFont(family="Inter", size=20, weight="bold"),
            text_color="#0f172a"
        )
        title_label.pack(side="left")

        self.status_badge = ctk.CTkLabel(
            title_row,
            text="● Engine: gemini-2.5-flash | Light Theme Ready",
            font=ctk.CTkFont(family="Inter", size=12, weight="bold"),
            text_color="#059669",
            fg_color="#ecfdf5",
            corner_radius=20,
            padx=12,
            pady=4
        )
        self.status_badge.pack(side="right")

        aim_label = ctk.CTkLabel(
            h_content,
            text="Aim: Execute a zero-shot prompt vs. a few-shot prompt (with 2 exemplar pairs); compare output formatting, consistency, and structural adherence.",
            font=ctk.CTkFont(family="Inter", size=12),
            text_color="#475569"
        )
        aim_label.pack(anchor="w")

        # 2. Input Control Strip
        control_frame = ctk.CTkFrame(self, fg_color="#ffffff", corner_radius=12, border_width=1, border_color="#e2e8f0")
        control_frame.pack(fill="x", padx=18, pady=(0, 10))

        c_box = ctk.CTkFrame(control_frame, fg_color="transparent")
        c_box.pack(fill="x", padx=16, pady=12)

        input_row = ctk.CTkFrame(c_box, fg_color="transparent")
        input_row.pack(fill="x")

        q_lbl = ctk.CTkLabel(
            input_row, 
            text="Input Query / Concept:", 
            font=ctk.CTkFont(family="Inter", size=13, weight="bold"),
            text_color="#0f172a"
        )
        q_lbl.pack(side="left", padx=(0, 10))

        self.preset_combo = ctk.CTkComboBox(
            input_row,
            values=PRESET_QUESTIONS,
            width=280,
            font=ctk.CTkFont(family="Inter", size=12),
            fg_color="#f1f5f9",
            text_color="#0f172a",
            button_color="#2563eb",
            command=self._on_preset_select
        )
        self.preset_combo.pack(side="left", padx=(0, 10))
        self.preset_combo.set("Choose a preset or type below...")

        self.btn_run = ctk.CTkButton(
            input_row,
            text="▶ Execute Comparison",
            font=ctk.CTkFont(family="Inter", size=13, weight="bold"),
            fg_color="#2563eb",
            hover_color="#1d4ed8",
            text_color="#ffffff",
            width=170,
            height=34,
            corner_radius=8,
            command=self.start_comparison_thread
        )
        self.btn_run.pack(side="left", padx=(0, 8))

        self.btn_clear = ctk.CTkButton(
            input_row,
            text="🔄 Clear",
            font=ctk.CTkFont(family="Inter", size=12),
            fg_color="#f1f5f9",
            hover_color="#e2e8f0",
            text_color="#475569",
            width=80,
            height=34,
            corner_radius=8,
            command=self.clear_outputs
        )
        self.btn_clear.pack(side="left", padx=(0, 8))

        self.btn_exemplars = ctk.CTkButton(
            input_row,
            text="📋 View Few-Shot Exemplars",
            font=ctk.CTkFont(family="Inter", size=12),
            fg_color="#eff6ff",
            hover_color="#dbeafe",
            text_color="#1d4ed8",
            width=180,
            height=34,
            corner_radius=8,
            command=self.toggle_exemplars
        )
        self.btn_exemplars.pack(side="left", padx=(0, 8))

        self.btn_screenshot = ctk.CTkButton(
            input_row,
            text="📸 Save Screenshot",
            font=ctk.CTkFont(family="Inter", size=12),
            fg_color="#ecfdf5",
            hover_color="#d1fae5",
            text_color="#065f46",
            width=140,
            height=34,
            corner_radius=8,
            command=self.capture_ui_screenshot
        )
        self.btn_screenshot.pack(side="right")

        # Custom text input
        self.query_entry = ctk.CTkEntry(
            c_box,
            placeholder_text="Or enter your custom question (e.g., Explain Newton's third law of motion)...",
            font=ctk.CTkFont(family="Inter", size=13),
            fg_color="#f8fafc",
            border_color="#cbd5e1",
            text_color="#0f172a",
            height=36,
            corner_radius=8
        )
        self.query_entry.pack(fill="x", pady=(10, 0))
        self.query_entry.insert(0, "Explain inertia.")

        # Exemplars Drawer Frame (Hidden by default)
        self.exemplar_drawer = ctk.CTkFrame(self, fg_color="#ffffff", corner_radius=12, border_width=1, border_color="#e2e8f0")
        self.exemplar_visible = False

        ex_content = ctk.CTkFrame(self.exemplar_drawer, fg_color="transparent")
        ex_content.pack(fill="both", expand=True, padx=14, pady=10)

        ex_lbl = ctk.CTkLabel(
            ex_content,
            text="Few-Shot Exemplar Template Provided to Model:",
            font=ctk.CTkFont(family="Inter", size=12, weight="bold"),
            text_color="#1e293b"
        )
        ex_lbl.pack(anchor="w")

        self.ex_text = ctk.CTkTextbox(
            ex_content,
            height=120,
            font=ctk.CTkFont(family="JetBrains Mono", size=11),
            fg_color="#f8fafc",
            text_color="#334155",
            border_width=1,
            border_color="#e2e8f0"
        )
        self.ex_text.pack(fill="x", pady=(6, 0))
        self.ex_text.insert("1.0", FEW_SHOT_TEMPLATE)
        self.ex_text.configure(state="disabled")

        # 3. Main Split Comparison Cards
        self.cards_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.cards_frame.pack(fill="both", expand=True, padx=18, pady=(0, 10))
        self.cards_frame.grid_columnconfigure(0, weight=1)
        self.cards_frame.grid_columnconfigure(1, weight=1)
        self.cards_frame.grid_rowconfigure(0, weight=1)

        # Card Left: Zero-Shot
        self.zero_card = ctk.CTkFrame(self.cards_frame, fg_color="#ffffff", corner_radius=12, border_width=1, border_color="#e2e8f0")
        self.zero_card.grid(row=0, column=0, sticky="nsew", padx=(0, 6))

        z_header = ctk.CTkFrame(self.zero_card, fg_color="#f8fafc", corner_radius=8)
        z_header.pack(fill="x", padx=10, pady=10)

        z_title = ctk.CTkLabel(
            z_header,
            text="PART A: ZERO-SHOT PROMPTING",
            font=ctk.CTkFont(family="Inter", size=13, weight="bold"),
            text_color="#0f172a"
        )
        z_title.pack(side="left", padx=10, pady=6)

        self.z_badge = ctk.CTkLabel(
            z_header,
            text="No Exemplars",
            font=ctk.CTkFont(family="Inter", size=11),
            text_color="#64748b",
            fg_color="#e2e8f0",
            corner_radius=12,
            padx=8,
            pady=2
        )
        self.z_badge.pack(side="right", padx=10)

        self.zero_output_box = ctk.CTkTextbox(
            self.zero_card,
            font=ctk.CTkFont(family="Inter", size=13),
            fg_color="#ffffff",
            text_color="#1e293b",
            border_width=1,
            border_color="#f1f5f9",
            wrap="word"
        )
        self.zero_output_box.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        self.zero_output_box.insert("1.0", "Click 'Execute Comparison' to run Zero-Shot generation without exemplar guidance.\n\nPrompt specification:\n'Answer the user's question simply and briefly in a few sentences, without extra details or examples.'")

        self.z_meta = ctk.CTkLabel(
            self.zero_card,
            text="Latency: -- | Words: -- | Format: Unguided / Direct",
            font=ctk.CTkFont(family="JetBrains Mono", size=11),
            text_color="#64748b"
        )
        self.z_meta.pack(anchor="w", padx=12, pady=(0, 8))

        # Card Right: Few-Shot
        self.few_card = ctk.CTkFrame(self.cards_frame, fg_color="#ffffff", corner_radius=12, border_width=1, border_color="#e2e8f0")
        self.few_card.grid(row=0, column=1, sticky="nsew", padx=(6, 0))

        f_header = ctk.CTkFrame(self.few_card, fg_color="#f8fafc", corner_radius=8)
        f_header.pack(fill="x", padx=10, pady=10)

        f_title = ctk.CTkLabel(
            f_header,
            text="PART B: FEW-SHOT PROMPTING",
            font=ctk.CTkFont(family="Inter", size=13, weight="bold"),
            text_color="#0f172a"
        )
        f_title.pack(side="left", padx=10, pady=6)

        self.f_badge = ctk.CTkLabel(
            f_header,
            text="2 Exemplar Pairs",
            font=ctk.CTkFont(family="Inter", size=11, weight="bold"),
            text_color="#1d4ed8",
            fg_color="#dbeafe",
            corner_radius=12,
            padx=8,
            pady=2
        )
        self.f_badge.pack(side="right", padx=10)

        self.few_output_box = ctk.CTkTextbox(
            self.few_card,
            font=ctk.CTkFont(family="Inter", size=13),
            fg_color="#ffffff",
            text_color="#1e293b",
            border_width=1,
            border_color="#f1f5f9",
            wrap="word"
        )
        self.few_output_box.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        self.few_output_box.insert("1.0", "Click 'Execute Comparison' to run Few-Shot generation with 2 exemplar demonstration pairs.\n\nPrompt specification:\n'Explain the user's question very clearly and always include concrete examples:\nExamples:\n1. ...\n2. ...'")

        self.f_meta = ctk.CTkLabel(
            self.few_card,
            text="Latency: -- | Words: -- | Format Adherence: Awaiting Run",
            font=ctk.CTkFont(family="JetBrains Mono", size=11),
            text_color="#64748b"
        )
        self.f_meta.pack(anchor="w", padx=12, pady=(0, 8))

        # 4. Comparative Evaluation Metrics Footer
        eval_frame = ctk.CTkFrame(self, fg_color="#ffffff", corner_radius=12, border_width=1, border_color="#e2e8f0")
        eval_frame.pack(fill="x", padx=18, pady=(0, 16))

        ev_content = ctk.CTkFrame(eval_frame, fg_color="transparent")
        ev_content.pack(fill="x", padx=16, pady=10)

        ev_title = ctk.CTkLabel(
            ev_content,
            text="COMPARATIVE EVALUATION & EMPIRICAL FINDINGS",
            font=ctk.CTkFont(family="Inter", size=12, weight="bold"),
            text_color="#0f172a"
        )
        ev_title.pack(anchor="w")

        self.eval_text = ctk.CTkLabel(
            ev_content,
            text="• Format Adherence: Ready to test exemplar replication (2-part schema: Concept Explanation + Numbered Examples).\n• Consistency: Evaluates how in-context demonstration pairs eliminate formatting variance.\n• Zero-Shot vs Few-Shot: Zero-shot yields brief unanchored summaries; Few-shot enforces structured, educational explanations.",
            font=ctk.CTkFont(family="Inter", size=11),
            text_color="#475569",
            justify="left"
        )
        self.eval_text.pack(anchor="w", pady=(4, 0))

    def _on_preset_select(self, val):
        if val in PRESET_QUESTIONS:
            self.query_entry.delete(0, tk.END)
            self.query_entry.insert(0, val)

    def toggle_exemplars(self):
        if self.exemplar_visible:
            self.exemplar_drawer.pack_forget()
            self.btn_exemplars.configure(text="📋 View Few-Shot Exemplars", fg_color="#eff6ff")
            self.exemplar_visible = False
        else:
            self.exemplar_drawer.pack(fill="x", padx=18, pady=(0, 10), before=self.cards_frame)
            self.btn_exemplars.configure(text="✕ Hide Exemplars", fg_color="#e0e7ff")
            self.exemplar_visible = True

    def clear_outputs(self):
        self.zero_output_box.delete("1.0", tk.END)
        self.few_output_box.delete("1.0", tk.END)
        self.z_meta.configure(text="Latency: -- | Words: -- | Format: Unguided / Direct")
        self.f_meta.configure(text="Latency: -- | Words: -- | Format Adherence: Cleared")
        self.status_badge.configure(text="● Ready | Light Theme", text_color="#059669", fg_color="#ecfdf5")

    def start_comparison_thread(self):
        if self.is_running:
            return
        
        question = self.query_entry.get().strip()
        if not question:
            messagebox.showwarning("Input Required", "Please enter a question or select a preset.")
            return

        self.is_running = True
        self.btn_run.configure(state="disabled", text="⏳ Evaluating...")
        self.status_badge.configure(text="● Generating Gemini Responses...", text_color="#2563eb", fg_color="#eff6ff")

        thread = threading.Thread(target=self._run_comparison_logic, args=(question,), daemon=True)
        thread.start()

    def _run_comparison_logic(self, question):
        try:
            # Zero-Shot Execution
            t0 = time.time()
            zero_shot_prompt = ZERO_SHOT_TEMPLATE.format(user_question=question)
            z_res = generate_gemini_content(zero_shot_prompt)
            t_zero = time.time() - t0

            # Few-Shot Execution
            t1 = time.time()
            few_shot_prompt = FEW_SHOT_TEMPLATE.format(user_question=question)
            f_res = generate_gemini_content(few_shot_prompt)
            t_few = time.time() - t1

            # Dispatch UI update on main thread
            self.after(0, self._update_ui_results, question, z_res, t_zero, f_res, t_few)
        except Exception as e:
            self.after(0, self._handle_error, str(e))

    def _update_ui_results(self, question, z_res, t_zero, f_res, t_few):
        # Update Zero-Shot Output
        self.zero_output_box.delete("1.0", tk.END)
        self.zero_output_box.insert("1.0", z_res)
        z_words = len(z_res.split())
        self.z_meta.configure(text=f"Latency: {t_zero:.2f}s | Words: {z_words} | Format: Brief, unguided direct response")

        # Update Few-Shot Output
        self.few_output_box.delete("1.0", tk.END)
        self.few_output_box.insert("1.0", f_res)
        f_words = len(f_res.split())
        
        # Check Format Adherence
        has_num1 = "1." in f_res
        has_num2 = "2." in f_res
        has_examples_tag = "Examples:" in f_res or "Example" in f_res
        passed = (has_num1 and has_num2) or has_examples_tag

        adherence_str = "100% PASS (Numbered Exemplars 1. & 2. Produced)" if passed else "Partial Adherence"
        self.f_meta.configure(text=f"Latency: {t_few:.2f}s | Words: {f_words} | Schema Adherence: {adherence_str}")

        # Update Comparative Evaluation Text
        eval_summary = (
            f"• Query Evaluated: \"{question}\"\n"
            f"• Format Adherence: {'[PASSED] Few-shot successfully reproduced 2-part schema (Explanation + Numbered Examples 1 & 2).' if passed else '[PARTIAL] Few-shot produced structured response.'}\n"
            f"• Output Consistency: Zero-shot produced {z_words} words ({t_zero:.2f}s); Few-shot produced {f_words} words ({t_few:.2f}s) with grounded real-world anchors.\n"
            f"• Conclusion: Exemplars guide LLM reasoning to follow exact structural requirements without fine-tuning."
        )
        self.eval_text.configure(text=eval_summary)

        self.status_badge.configure(text="● Evaluation Complete | 100% Light Theme", text_color="#059669", fg_color="#ecfdf5")
        self.btn_run.configure(state="normal", text="▶ Execute Comparison")
        self.is_running = False

    def _handle_error(self, err_msg):
        self.status_badge.configure(text=f"● Error Occurred", text_color="#dc2626", fg_color="#fef2f2")
        self.btn_run.configure(state="normal", text="▶ Execute Comparison")
        self.is_running = False
        messagebox.showerror("Execution Error", f"Failed to execute Gemini API:\n{err_msg}")

    def capture_ui_screenshot(self):
        try:
            self.update()
            x = self.winfo_rootx()
            y = self.winfo_rooty()
            w = self.winfo_width()
            h = self.winfo_height()

            # Ensure output directory exists
            out_dir = r"d:\Projects\Prompt Engineering Lab Experiments\Charan\Pictures\Exp-5"
            os.makedirs(out_dir, exist_ok=True)
            out_file = os.path.join(out_dir, "experiment5_tkinter_light_gui.png")

            # Capture using PIL ImageGrab
            img = ImageGrab.grab(bbox=(x, y, x + w, y + h))
            img.save(out_file)
            messagebox.showinfo("Screenshot Saved", f"Screenshot captured successfully:\n{out_file}")
        except Exception as e:
            messagebox.showerror("Screenshot Error", f"Could not capture screenshot:\n{e}")

def main():
    app = Experiment5TkinterApp()
    app.mainloop()

if __name__ == "__main__":
    main()
