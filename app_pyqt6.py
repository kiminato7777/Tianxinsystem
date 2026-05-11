import os
import sys
import threading
import numpy as np
import soundfile as sf
import re
from pathlib import Path

# --- Robust Path Management ---
ROOT_DIR = Path(__file__).resolve().parent
SRC_DIR = ROOT_DIR / "src"
ASSETS_DIR = ROOT_DIR / "assets"
OUTPUT_PATH = ROOT_DIR / "output_audio.wav"
VOICES_DIR = ROOT_DIR / "voices"

# Create voices dir if not exists
VOICES_DIR.mkdir(exist_ok=True)

# Add src to sys.path immediately
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

# --- PyQt6 Imports ---
try:
    from PyQt6.QtWidgets import (
        QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
        QLabel, QLineEdit, QTextEdit, QPushButton, QCheckBox,
        QSlider, QGroupBox, QFileDialog, QMessageBox, QProgressBar,
        QScrollArea, QFrame, QSizePolicy, QGridLayout, QComboBox
    )
    from PyQt6.QtCore import Qt, QThread, pyqtSignal, QUrl, QSize, QTimer
    from PyQt6.QtGui import QFont, QIcon, QPixmap, QColor, QPalette, QLinearGradient, QBrush
except ImportError as e:
    print(f"CRITICAL: PyQt6 not found. Please install it with 'pip install PyQt6'.\nError: {e}")
    sys.exit(1)

# Optional Multimedia
try:
    from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
    HAS_MULTIMEDIA = True
except ImportError:
    HAS_MULTIMEDIA = False
    print("WARNING: PyQt6.QtMultimedia not found. Audio playback will be disabled.")

# --- Workers ---

class VoxCPMWorker(QThread):
    finished = pyqtSignal(str, str)
    progress = pyqtSignal(str)

    def __init__(self, kwargs):
        super().__init__()
        self.kwargs = kwargs

    def run(self):
        try:
            self.progress.emit("Initializing AI Core...")
            import torch
            import voxcpm
            
            # Ensure model is loaded (cached by voxcpm)
            self.progress.emit("Loading VoxCPM-2 Model (this may take a moment)...")
            voxcpm_model = voxcpm.VoxCPM.from_pretrained("openbmb/VoxCPM2", optimize=True)
            
            text = self.kwargs.get("text", "")
            control = self.kwargs.get("control", "")
            ref_wav = self.kwargs.get("ref_wav", None)
            prompt_text = self.kwargs.get("prompt_text", None)
            
            # Prepare instruction
            control = re.sub(r"[()（）]", "", control).strip()
            final_text = f"({control}){text}" if control else text
            
            self.progress.emit("Synthesizing Speech...")
            generate_kwargs = dict(
                text=final_text,
                reference_wav_path=ref_wav,
                cfg_value=self.kwargs.get("cfg_value", 2.0),
                inference_timesteps=self.kwargs.get("inference_timesteps", 10),
                normalize=self.kwargs.get("do_normalize", True),
                denoise=self.kwargs.get("denoise", True),
            )
            
            if prompt_text and ref_wav:
                generate_kwargs["prompt_wav_path"] = ref_wav
                generate_kwargs["prompt_text"] = prompt_text
                
            wav = voxcpm_model.generate(**generate_kwargs)
            
            # Save Output
            sf.write(str(OUTPUT_PATH), wav, voxcpm_model.tts_model.sample_rate)
            
            self.finished.emit(str(OUTPUT_PATH), "")
        except Exception as e:
            self.finished.emit("", str(e))

class ASRWorker(QThread):
    finished = pyqtSignal(str, str)
    def __init__(self, audio_path):
        super().__init__()
        self.audio_path = audio_path
    def run(self):
        try:
            from funasr import AutoModel
            import torch
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            asr_model = AutoModel(model="iic/SenseVoiceSmall", disable_update=True, device=device)
            res = asr_model.generate(input=self.audio_path, language="auto", use_itn=True)
            text = res[0]["text"].split("|>")[-1]
            self.finished.emit(text, "")
        except Exception as e:
            self.finished.emit("", str(e))

# --- Voice Presets ---

VOICE_PRESETS = {
    "Custom / Manual": "",
    "🎙️ News Anchor (Male)": "A professional news anchor voice, speaking clearly, formally, and with perfect articulation.",
    "🎙️ News Anchor (Female)": "A formal and clear female news anchor voice, authoritative yet pleasant.",
    "🎭 Storyteller (Warm)": "A warm, expressive voice, perfect for reading audiobooks or telling fairy tales.",
    "🎬 Movie Trailer (Epic)": "A very deep, dramatic, and cinematic voice with a lot of bass and gravitas.",
    "📻 Radio DJ (Energetic)": "A high-energy, fast-paced, and charismatic radio personality.",
    "👔 Business Professional": "A calm, neutral, and confident voice for corporate presentations.",
    "🧘 Calm & Soothing": "A very gentle, slow-paced voice designed for meditation and relaxation.",
    "👵 Wisdom Elder": "A raspy, aged, and wise voice of an elderly person, full of experience.",
    "👶 Young Boy (Playful)": "A high-pitched, energetic, and playful voice of a child.",
    "👧 Cheerful Girl": "A bright, happy, and optimistic voice of a young girl.",
    "🤖 AI / Robot": "A slightly monotone, precise, and futuristic artificial intelligence voice.",
    "💥 Anime (Excited)": "An extremely high-energy, loud, and dramatic voice typical of anime protagonists.",
    "🌑 Dark & Mysterious": "A low-volume, breathy, and intriguing voice with a hint of mystery.",
    "🗣️ Fast Speaker": "Someone speaking very rapidly and with high intensity.",
    "🤫 Soft Whisper": "A very quiet, intimate whisper, almost like ASMR.",
}

# --- UI Styles (Fixed & Refined) ---

STYLE_SHEET = """
QMainWindow {
    background-color: #09090B;
}
QWidget {
    color: #FAFAFA;
    font-family: 'Inter', 'Segoe UI', sans-serif;
}
QLabel#header_title {
    font-size: 32px;
    font-weight: 900;
    color: #FFFFFF;
}
QLabel#header_subtitle {
    font-size: 14px;
    color: #A1A1AA;
}
QFrame#card {
    background-color: #18181B;
    border: 1px solid #27272A;
    border-radius: 12px;
}
QLabel#card_title {
    font-size: 13px;
    font-weight: 700;
    color: #E4E4E7;
    text-transform: uppercase;
}
QLineEdit, QTextEdit {
    background-color: #09090B;
    border: 1px solid #27272A;
    border-radius: 8px;
    padding: 10px;
    color: #F4F4F5;
}
QLineEdit:focus, QTextEdit:focus {
    border: 1px solid #6366F1;
}
QPushButton#primary_btn {
    background-color: #6366F1;
    color: white;
    border-radius: 10px;
    font-weight: 700;
    font-size: 14px;
    padding: 12px;
}
QPushButton#primary_btn:hover { background-color: #818CF8; }
QPushButton#primary_btn:disabled { background-color: #3F3F46; color: #71717A; }

QPushButton#secondary_btn {
    background-color: #27272A;
    color: #F4F4F5;
    border: 1px solid #3F3F46;
    border-radius: 8px;
    padding: 8px 16px;
}
QPushButton#secondary_btn:hover { background-color: #3F3F46; }
QPushButton#secondary_btn:disabled { color: #52525B; }

QProgressBar {
    background-color: #27272A;
    border: none;
    height: 4px;
    border-radius: 2px;
    text-align: center;
}
QProgressBar::chunk {
    background-color: #6366F1;
    border-radius: 2px;
}
QSlider::groove:horizontal {
    background: #27272A;
    height: 6px;
    border-radius: 3px;
}
QSlider::handle:horizontal {
    background: #6366F1;
    width: 16px;
    height: 16px;
    margin: -5px 0;
    border-radius: 8px;
}
QComboBox {
    background-color: #18181B;
    border: 1px solid #27272A;
    border-radius: 8px;
    padding: 8px 12px;
    color: #F4F4F5;
    min-width: 200px;
}
QComboBox:hover {
    border: 1px solid #3F3F46;
}
QComboBox::drop-down {
    border: none;
    width: 30px;
}
QComboBox::down-arrow {
    image: none;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #A1A1AA;
    margin-right: 10px;
}
QComboBox QAbstractItemView {
    background-color: #18181B;
    border: 1px solid #27272A;
    selection-background-color: #6366F1;
    selection-color: white;
    outline: none;
}
QScrollArea {
    border: none;
    background-color: transparent;
}
QFrame#voice_item {
    background-color: #27272A;
    border-radius: 8px;
    padding: 10px;
}
QFrame#voice_item:hover {
    background-color: #3F3F46;
}
"""

class VoxCPMApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("VoxCPM Studio Pro")
        self.resize(1100, 950)
        
        # Audio Player Init
        self.player = None
        if HAS_MULTIMEDIA:
            self.player = QMediaPlayer()
            self.audio_output = QAudioOutput()
            self.player.setAudioOutput(self.audio_output)
        
        self.setup_ui()
        self.setStyleSheet(STYLE_SHEET)
        self.refresh_library()

    def setup_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(40, 30, 40, 30)
        main_layout.setSpacing(25)

        # --- Header ---
        header = QWidget()
        h_layout = QHBoxLayout(header)
        h_layout.setContentsMargins(0,0,0,0)
        
        title_box = QVBoxLayout()
        t_label = QLabel("VoxCPM Studio Pro")
        t_label.setObjectName("header_title")
        s_label = QLabel("Ultimate AI Voice Cloning & Text-to-Speech")
        s_label.setObjectName("header_subtitle")
        title_box.addWidget(t_label)
        title_box.addWidget(s_label)
        h_layout.addLayout(title_box)
        
        h_layout.addStretch()
        
        # Logo
        logo_file = ASSETS_DIR / "voxcpm_logo.png"
        if logo_file.exists():
            logo = QLabel()
            pix = QPixmap(str(logo_file))
            logo.setPixmap(pix.scaled(100, 100, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
            h_layout.addWidget(logo)
            
        main_layout.addWidget(header)

        # --- Body ---
        body = QHBoxLayout()
        body.setSpacing(25)
        
        # Left Column
        left_col = QVBoxLayout()
        left_col.setSpacing(20)
        
        # Source Card
        card_src = QFrame(); card_src.setObjectName("card")
        l_src = QVBoxLayout(card_src); l_src.setContentsMargins(20,20,20,20)
        l_src.addWidget(QLabel("🎙️ VOICE SOURCE", objectName="card_title"))
        
        f_row = QHBoxLayout()
        self.ref_audio_input = QLineEdit()
        self.ref_audio_input.setPlaceholderText("Select reference audio file...")
        btn_browse = QPushButton("Browse")
        btn_browse.setObjectName("secondary_btn")
        btn_browse.clicked.connect(self.browse_audio)
        
        self.btn_save_voice = QPushButton("Save to Library")
        self.btn_save_voice.setObjectName("secondary_btn")
        self.btn_save_voice.clicked.connect(self.save_to_library)
        
        f_row.addWidget(self.ref_audio_input)
        f_row.addWidget(btn_browse)
        f_row.addWidget(self.btn_save_voice)
        l_src.addLayout(f_row)
        
        self.ultimate_cb = QCheckBox("Ultimate Mode (Auto-Transcript)")
        l_src.addWidget(self.ultimate_cb)
        self.ultimate_cb.stateChanged.connect(self.toggle_ultimate)
        
        self.prompt_text = QTextEdit()
        self.prompt_text.setPlaceholderText("Transcript will appear here...")
        self.prompt_text.setMaximumHeight(80)
        self.prompt_text.setVisible(False)
        l_src.addWidget(self.prompt_text)
        left_col.addWidget(card_src)
        
        # Control Card
        card_ctrl = QFrame(); card_ctrl.setObjectName("card")
        l_ctrl = QVBoxLayout(card_ctrl); l_ctrl.setContentsMargins(20,20,20,20)
        l_ctrl.addWidget(QLabel("🎛️ VOICE DESIGN / INSTRUCTION", objectName="card_title"))
        
        preset_row = QHBoxLayout()
        preset_row.addWidget(QLabel("Presets:"))
        self.preset_combo = QComboBox()
        self.preset_combo.addItems(list(VOICE_PRESETS.keys()))
        self.preset_combo.currentTextChanged.connect(self.on_preset_changed)
        preset_row.addWidget(self.preset_combo)
        l_ctrl.addLayout(preset_row)
        
        self.control_input = QLineEdit()
        self.control_input.setPlaceholderText("e.g. Whispering, Excited, Calm, Male, Female...")
        l_ctrl.addWidget(self.control_input)
        left_col.addWidget(card_ctrl)
        
        # Target Card
        card_tgt = QFrame(); card_tgt.setObjectName("card")
        l_tgt = QVBoxLayout(card_tgt); l_tgt.setContentsMargins(20,20,20,20)
        l_tgt.addWidget(QLabel("✍️ TARGET TEXT", objectName="card_title"))
        self.target_text = QTextEdit()
        self.target_text.setPlaceholderText("Enter the text you want the AI to speak...")
        self.target_text.setText("Welcome to VoxCPM Studio, where AI voices come to life with incredible realism.")
        l_tgt.addWidget(self.target_text)
        left_col.addWidget(card_tgt)
        
        # 4. Voice Library Card
        card_lib = QFrame(); card_lib.setObjectName("card")
        l_lib = QVBoxLayout(card_lib); l_lib.setContentsMargins(20,20,20,20)
        l_lib.addWidget(QLabel("📚 VOICE LIBRARY / CLONED VOICES", objectName="card_title"))
        
        self.scroll_lib = QScrollArea()
        self.scroll_lib.setWidgetResizable(True)
        self.scroll_content = QWidget()
        self.scroll_layout = QHBoxLayout(self.scroll_content)
        self.scroll_layout.setAlignment(Qt.AlignmentFlag.AlignLeft)
        self.scroll_lib.setWidget(self.scroll_content)
        self.scroll_lib.setMaximumHeight(150)
        l_lib.addWidget(self.scroll_lib)
        
        left_col.addWidget(card_lib)
        
        body.addLayout(left_col, 6)
        
        # Right Column
        right_col = QVBoxLayout()
        right_col.setSpacing(20)
        
        # Action Card
        card_act = QFrame(); card_act.setObjectName("card")
        l_act = QVBoxLayout(card_act); l_act.setContentsMargins(20,20,20,20)
        l_act.addWidget(QLabel("🔊 GENERATION", objectName="card_title"))
        
        self.status_label = QLabel("System Ready")
        self.status_label.setStyleSheet("color: #A1A1AA; font-size: 12px;")
        l_act.addWidget(self.status_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        l_act.addWidget(self.progress_bar)
        
        self.gen_btn = QPushButton("🔊 Start Generating")
        self.gen_btn.setObjectName("primary_btn")
        self.gen_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.gen_btn.clicked.connect(self.generate)
        l_act.addWidget(self.gen_btn)
        
        btns = QHBoxLayout()
        self.play_btn = QPushButton("▶ Play")
        self.play_btn.setObjectName("secondary_btn")
        self.play_btn.setEnabled(False)
        self.play_btn.clicked.connect(self.play_audio)
        
        self.export_btn = QPushButton("💾 Save")
        self.export_btn.setObjectName("secondary_btn")
        self.export_btn.setEnabled(False)
        self.export_btn.clicked.connect(self.export_audio)
        
        btns.addWidget(self.play_btn)
        btns.addWidget(self.export_btn)
        l_act.addLayout(btns)
        right_col.addWidget(card_act)
        
        # Settings Card
        card_set = QFrame(); card_set.setObjectName("card")
        l_set = QVBoxLayout(card_set); l_set.setContentsMargins(20,20,20,20)
        l_set.addWidget(QLabel("⚙️ ADVANCED SETTINGS", objectName="card_title"))
        
        self.denoise_cb = QCheckBox("Enhance Audio Quality")
        self.denoise_cb.setChecked(True)
        self.norm_cb = QCheckBox("Text Normalization")
        self.norm_cb.setChecked(True)
        l_set.addWidget(self.denoise_cb)
        l_set.addWidget(self.norm_cb)
        
        # CFG
        l_set.addWidget(QLabel("Guidance Scale (CFG):"))
        h_cfg = QHBoxLayout()
        self.cfg_slider = QSlider(Qt.Orientation.Horizontal)
        self.cfg_slider.setRange(10, 50); self.cfg_slider.setValue(20)
        self.cfg_lab = QLabel("2.0")
        self.cfg_slider.valueChanged.connect(lambda v: self.cfg_lab.setText(f"{v/10.0:.1f}"))
        h_cfg.addWidget(self.cfg_slider); h_cfg.addWidget(self.cfg_lab)
        l_set.addLayout(h_cfg)
        
        # Steps
        l_set.addWidget(QLabel("Inference Steps:"))
        h_stp = QHBoxLayout()
        self.steps_slider = QSlider(Qt.Orientation.Horizontal)
        self.steps_slider.setRange(1, 100); self.steps_slider.setValue(10)
        self.steps_lab = QLabel("10")
        self.steps_slider.valueChanged.connect(lambda v: self.steps_lab.setText(str(v)))
        h_stp.addWidget(self.steps_slider); h_stp.addWidget(self.steps_lab)
        l_set.addLayout(h_stp)
        
        right_col.addWidget(card_set)
        right_col.addStretch()
        
        body.addLayout(right_col, 4)
        main_layout.addLayout(body)

    # --- Methods ---

    def refresh_library(self):
        # Clear existing
        for i in reversed(range(self.scroll_layout.count())): 
            self.scroll_layout.itemAt(i).widget().setParent(None)
            
        # Scan voices folder
        voice_files = list(VOICES_DIR.glob("*.wav")) + list(VOICES_DIR.glob("*.mp3"))
        # Add examples too
        examples = list((ROOT_DIR / "examples").glob("*.wav"))
        
        all_voices = voice_files + examples
        
        if not all_voices:
            self.scroll_layout.addWidget(QLabel("No voices saved yet."))
            return

        for v_path in all_voices:
            btn = QPushButton(v_path.name)
            btn.setObjectName("secondary_btn")
            btn.setFixedWidth(180)
            btn.clicked.connect(lambda checked, p=str(v_path): self.select_voice(p))
            self.scroll_layout.addWidget(btn)

    def select_voice(self, path):
        self.ref_audio_input.setText(path)
        if self.ultimate_cb.isChecked():
            self.run_asr(path)

    def save_to_library(self):
        current = self.ref_audio_input.text()
        if not current or not os.path.exists(current):
            QMessageBox.warning(self, "Error", "Select a valid audio file first!")
            return
            
        name, ok = QFileDialog.getSaveFileName(self, "Save Voice to Library", str(VOICES_DIR / Path(current).name), "Audio (*.wav *.mp3)")
        if ok and name:
            import shutil
            shutil.copy2(current, name)
            self.refresh_library()
            QMessageBox.information(self, "Success", "Voice saved to library!")

    def on_preset_changed(self, preset_name):
        desc = VOICE_PRESETS.get(preset_name, "")
        self.control_input.setText(desc)

    def browse_audio(self):
        file, _ = QFileDialog.getOpenFileName(self, "Open Reference Audio", "", "Audio (*.wav *.mp3 *.flac *.m4a)")
        if file:
            self.ref_audio_input.setText(file)
            if self.ultimate_cb.isChecked():
                self.run_asr(file)

    def toggle_ultimate(self, state):
        visible = state == Qt.CheckState.Checked.value
        self.prompt_text.setVisible(visible)
        if visible and self.ref_audio_input.text():
            self.run_asr(self.ref_audio_input.text())

    def run_asr(self, path):
        if not path: return
        self.status_label.setText("ASR: Transcribing reference...")
        self.asr_worker = ASRWorker(path)
        self.asr_worker.finished.connect(self.on_asr_finished)
        self.asr_worker.start()

    def on_asr_finished(self, text, err):
        if err:
            self.status_label.setText(f"ASR Error: {err}")
        else:
            self.prompt_text.setText(text)
            self.status_label.setText("ASR: Success")

    def generate(self):
        text = self.target_text.toPlainText().strip()
        if not text:
            QMessageBox.warning(self, "Warning", "Target text is empty!")
            return
            
        kwargs = {
            "text": text,
            "control": self.control_input.text().strip(),
            "ref_wav": self.ref_audio_input.text().strip() or None,
            "prompt_text": self.prompt_text.toPlainText().strip() if self.ultimate_cb.isChecked() else None,
            "cfg_value": self.cfg_slider.value() / 10.0,
            "inference_timesteps": self.steps_slider.value(),
            "do_normalize": self.norm_cb.isChecked(),
            "denoise": self.denoise_cb.isChecked(),
        }
        
        self.gen_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.status_label.setText("Preparing...")
        
        self.worker = VoxCPMWorker(kwargs)
        self.worker.progress.connect(self.status_label.setText)
        self.worker.finished.connect(self.on_gen_finished)
        self.worker.start()

    def on_gen_finished(self, path, err):
        self.gen_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        if err:
            self.status_label.setText("Error occurred")
            QMessageBox.critical(self, "Error", f"Generation failed:\n{err}")
        else:
            self.status_label.setText("Generated successfully!")
            self.current_audio = path
            self.play_btn.setEnabled(True)
            self.export_btn.setEnabled(True)
            if self.player:
                self.play_audio()

    def play_audio(self):
        if HAS_MULTIMEDIA and hasattr(self, 'current_audio'):
            self.player.setSource(QUrl.fromLocalFile(self.current_audio))
            self.player.play()
        elif not HAS_MULTIMEDIA:
            QMessageBox.information(self, "Notice", f"Audio playback is disabled. File saved at:\n{self.current_audio}")

    def export_audio(self):
        if not hasattr(self, 'current_audio'): return
        save_path, _ = QFileDialog.getSaveFileName(self, "Save Audio", "output.wav", "WAV (*.wav)")
        if save_path:
            import shutil
            shutil.copy2(self.current_audio, save_path)
            QMessageBox.information(self, "Success", f"Audio exported to:\n{save_path}")

if __name__ == "__main__":
    # Handle High DPI
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
    
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    
    try:
        window = VoxCPMApp()
        window.show()
        sys.exit(app.exec())
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
