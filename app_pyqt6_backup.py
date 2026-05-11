import os
import sys
import threading
import numpy as np
import soundfile as sf
import re
from pathlib import Path

# Add src to path for voxcpm
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QTextEdit, QPushButton, QCheckBox,
    QSlider, QGroupBox, QFileDialog, QMessageBox, QProgressBar,
    QScrollArea, QFrame, QSizePolicy, QGridLayout
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QUrl
from PyQt6.QtGui import QFont, QIcon, QAction
from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput

# Import VoxCPM dynamically in the thread to avoid blocking UI on startup
class VoxCPMWorker(QThread):
    finished = pyqtSignal(str, str)  # output_path, error_msg
    progress = pyqtSignal(str)

    def __init__(self, kwargs):
        super().__init__()
        self.kwargs = kwargs

    def run(self):
        try:
            self.progress.emit("Loading VoxCPM Model...")
            import torch
            import voxcpm
            
            model_id = "openbmb/VoxCPM2"
            device = "cuda" if torch.cuda.is_available() else "cpu"
            
            # Load model
            voxcpm_model = voxcpm.VoxCPM.from_pretrained(model_id, optimize=True)
            
            # Extract kwargs
            text = self.kwargs.get("text", "")
            control = self.kwargs.get("control", "")
            ref_wav = self.kwargs.get("ref_wav", None)
            prompt_text = self.kwargs.get("prompt_text", None)
            cfg_value = self.kwargs.get("cfg_value", 2.0)
            do_normalize = self.kwargs.get("do_normalize", True)
            denoise = self.kwargs.get("denoise", True)
            inference_timesteps = self.kwargs.get("inference_timesteps", 10)
            
            # Format text
            control = re.sub(r"[()（）]", "", control).strip()
            final_text = f"({control}){text}" if control else text
            
            self.progress.emit("Generating Speech...")
            
            generate_kwargs = dict(
                text=final_text,
                reference_wav_path=ref_wav,
                cfg_value=float(cfg_value),
                inference_timesteps=inference_timesteps,
                normalize=do_normalize,
                denoise=denoise,
            )
            
            if prompt_text and ref_wav:
                generate_kwargs["prompt_wav_path"] = ref_wav
                generate_kwargs["prompt_text"] = prompt_text
                
            wav = voxcpm_model.generate(**generate_kwargs)
            sr = voxcpm_model.tts_model.sample_rate
            
            # Save to temporary file
            out_path = os.path.join(os.path.dirname(__file__), "output_audio.wav")
            sf.write(out_path, wav, sr)
            
            self.finished.emit(out_path, "")
        except Exception as e:
            self.finished.emit("", str(e))

class ASRWorker(QThread):
    finished = pyqtSignal(str, str)
    progress = pyqtSignal(str)

    def __init__(self, audio_path):
        super().__init__()
        self.audio_path = audio_path

    def run(self):
        try:
            self.progress.emit("Running ASR on reference audio...")
            from funasr import AutoModel
            import torch
            
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            asr_model = AutoModel(
                model="iic/SenseVoiceSmall",
                disable_update=True,
                log_level="ERROR",
                device=device,
            )
            res = asr_model.generate(input=self.audio_path, language="auto", use_itn=True)
            text_result = res[0]["text"].split("|>")[-1]
            self.finished.emit(text_result, "")
        except Exception as e:
            self.finished.emit("", str(e))

class VoxCPMApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("VoxCPM Pro - AI Dubber Ultimate")
        self.resize(900, 750)
        self.setup_ui()
        
        self.player = QMediaPlayer()
        self.audio_output = QAudioOutput()
        self.player.setAudioOutput(self.audio_output)
        
    def setup_ui(self):
        # Main Layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)
        
        # Title
        title_label = QLabel("VoxCPM - Text to Speech & Voice Cloning")
        title_label.setFont(QFont("Segoe UI", 18, QFont.Weight.Bold))
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_layout.addWidget(title_label)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        
        # --- Voice Cloning Section ---
        cloning_group = QGroupBox("1. Voice Cloning & Audio (Optional)")
        cloning_layout = QVBoxLayout()
        
        file_layout = QHBoxLayout()
        self.ref_audio_input = QLineEdit()
        self.ref_audio_input.setPlaceholderText("Select reference audio for voice cloning...")
        browse_btn = QPushButton("Browse")
        browse_btn.clicked.connect(self.browse_audio)
        file_layout.addWidget(self.ref_audio_input)
        file_layout.addWidget(browse_btn)
        cloning_layout.addLayout(file_layout)
        
        self.ultimate_clone_cb = QCheckBox("Ultimate Cloning Mode (Extract transcript automatically)")
        self.ultimate_clone_cb.stateChanged.connect(self.toggle_ultimate_mode)
        cloning_layout.addWidget(self.ultimate_clone_cb)
        
        self.prompt_text_edit = QTextEdit()
        self.prompt_text_edit.setPlaceholderText("Transcript of reference audio will appear here...")
        self.prompt_text_edit.setMaximumHeight(60)
        self.prompt_text_edit.setVisible(False)
        cloning_layout.addWidget(self.prompt_text_edit)
        
        cloning_group.setLayout(cloning_layout)
        scroll_layout.addWidget(cloning_group)
        
        # --- Control & Target Text Section ---
        text_group = QGroupBox("2. Text & Control")
        text_layout = QVBoxLayout()
        
        self.control_edit = QLineEdit()
        self.control_edit.setPlaceholderText("Control Instruction (e.g. A warm young woman / Excited and fast-paced)")
        text_layout.addWidget(QLabel("Control Instruction (Optional):"))
        text_layout.addWidget(self.control_edit)
        
        self.target_text_edit = QTextEdit()
        self.target_text_edit.setPlaceholderText("Enter the text you want to generate...")
        self.target_text_edit.setText("VoxCPM2 is a creative multilingual TTS model from ModelBest, designed to generate highly realistic speech.")
        text_layout.addWidget(QLabel("Target Text (Required):"))
        text_layout.addWidget(self.target_text_edit)
        
        text_group.setLayout(text_layout)
        scroll_layout.addWidget(text_group)
        
        # --- Advanced Settings Section ---
        settings_group = QGroupBox("3. Advanced Settings")
        settings_layout = QGridLayout()
        
        self.denoise_cb = QCheckBox("Reference Audio Enhancement (Denoise)")
        self.denoise_cb.setChecked(False)
        self.normalize_cb = QCheckBox("Text Normalization")
        self.normalize_cb.setChecked(False)
        
        settings_layout.addWidget(self.denoise_cb, 0, 0)
        settings_layout.addWidget(self.normalize_cb, 0, 1)
        
        # CFG Slider
        cfg_layout = QHBoxLayout()
        cfg_layout.addWidget(QLabel("CFG (Guidance Scale):"))
        self.cfg_slider = QSlider(Qt.Orientation.Horizontal)
        self.cfg_slider.setRange(10, 30) # 1.0 to 3.0
        self.cfg_slider.setValue(20)
        self.cfg_label = QLabel("2.0")
        self.cfg_slider.valueChanged.connect(lambda v: self.cfg_label.setText(f"{v/10.0:.1f}"))
        cfg_layout.addWidget(self.cfg_slider)
        cfg_layout.addWidget(self.cfg_label)
        settings_layout.addLayout(cfg_layout, 1, 0)
        
        # Steps Slider
        steps_layout = QHBoxLayout()
        steps_layout.addWidget(QLabel("Flow-matching steps:"))
        self.steps_slider = QSlider(Qt.Orientation.Horizontal)
        self.steps_slider.setRange(1, 50)
        self.steps_slider.setValue(10)
        self.steps_label = QLabel("10")
        self.steps_slider.valueChanged.connect(lambda v: self.steps_label.setText(str(v)))
        steps_layout.addWidget(self.steps_slider)
        steps_layout.addWidget(self.steps_label)
        settings_layout.addLayout(steps_layout, 1, 1)
        
        settings_group.setLayout(settings_layout)
        scroll_layout.addWidget(settings_group)
        
        # Add stretch to push everything up
        scroll_layout.addStretch()
        scroll.setWidget(scroll_content)
        main_layout.addWidget(scroll)
        
        # --- Action Section ---
        self.status_label = QLabel("Ready")
        self.status_label.setStyleSheet("color: gray;")
        main_layout.addWidget(self.status_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0) # Indeterminate
        self.progress_bar.setVisible(False)
        main_layout.addWidget(self.progress_bar)
        
        action_layout = QHBoxLayout()
        self.generate_btn = QPushButton("🔊 Generate Speech")
        self.generate_btn.setMinimumHeight(40)
        self.generate_btn.setStyleSheet("background-color: #2b5c8f; color: white; font-weight: bold; font-size: 14px;")
        self.generate_btn.clicked.connect(self.generate_audio)
        
        self.play_btn = QPushButton("▶ Play Audio")
        self.play_btn.setMinimumHeight(40)
        self.play_btn.setEnabled(False)
        self.play_btn.clicked.connect(self.play_generated_audio)
        
        self.export_btn = QPushButton("💾 Export Audio")
        self.export_btn.setMinimumHeight(40)
        self.export_btn.setEnabled(False)
        self.export_btn.clicked.connect(self.export_audio)
        
        action_layout.addWidget(self.generate_btn)
        action_layout.addWidget(self.play_btn)
        action_layout.addWidget(self.export_btn)
        main_layout.addLayout(action_layout)

    def browse_audio(self):
        file, _ = QFileDialog.getOpenFileName(self, "Select Reference Audio", "", "Audio Files (*.wav *.mp3 *.flac *.m4a)")
        if file:
            self.ref_audio_input.setText(file)
            if self.ultimate_clone_cb.isChecked():
                self.run_asr(file)

    def toggle_ultimate_mode(self, state):
        is_checked = state == Qt.CheckState.Checked.value
        self.prompt_text_edit.setVisible(is_checked)
        self.control_edit.setEnabled(not is_checked)
        
        if is_checked and self.ref_audio_input.text().strip():
            self.run_asr(self.ref_audio_input.text().strip())

    def run_asr(self, audio_path):
        self.status_label.setText("Extracting transcript...")
        self.progress_bar.setVisible(True)
        self.generate_btn.setEnabled(False)
        
        self.asr_worker = ASRWorker(audio_path)
        self.asr_worker.progress.connect(self.status_label.setText)
        self.asr_worker.finished.connect(self.on_asr_finished)
        self.asr_worker.start()

    def on_asr_finished(self, text, error):
        self.progress_bar.setVisible(False)
        self.generate_btn.setEnabled(True)
        if error:
            QMessageBox.warning(self, "ASR Error", f"Failed to transcribe: {error}")
            self.status_label.setText("ASR Failed")
        else:
            self.prompt_text_edit.setText(text)
            self.status_label.setText("ASR Completed")

    def generate_audio(self):
        text = self.target_text_edit.toPlainText().strip()
        if not text:
            QMessageBox.warning(self, "Missing Input", "Target Text is required!")
            return
            
        kwargs = {
            "text": text,
            "control": self.control_edit.text().strip() if not self.ultimate_clone_cb.isChecked() else "",
            "ref_wav": self.ref_audio_input.text().strip() or None,
            "prompt_text": self.prompt_text_edit.toPlainText().strip() if self.ultimate_clone_cb.isChecked() else None,
            "cfg_value": self.cfg_slider.value() / 10.0,
            "do_normalize": self.normalize_cb.isChecked(),
            "denoise": self.denoise_cb.isChecked(),
            "inference_timesteps": self.steps_slider.value()
        }
        
        self.generate_btn.setEnabled(False)
        self.play_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.status_label.setText("Initializing...")
        self.status_label.setStyleSheet("color: #2b5c8f; font-weight: bold;")
        
        self.worker = VoxCPMWorker(kwargs)
        self.worker.progress.connect(self.status_label.setText)
        self.worker.finished.connect(self.on_generate_finished)
        self.worker.start()

    def on_generate_finished(self, out_path, error):
        self.generate_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        if error:
            self.status_label.setText("Generation Failed")
            self.status_label.setStyleSheet("color: red;")
            
            # Special message for torchcodec FFmpeg error
            if "libtorchcodec" in error:
                QMessageBox.critical(self, "FFmpeg Error", 
                    "Failed to load libtorchcodec. This is usually because FFmpeg is not installed properly on your system.\n\n"
                    "Please install FFmpeg (full-shared build with DLLs) and add it to your System PATH, then try again.")
            else:
                QMessageBox.critical(self, "Generation Error", str(error))
        else:
            self.status_label.setText(f"Success! Saved to: {out_path}")
            self.status_label.setStyleSheet("color: green;")
            self.current_audio = out_path
            self.play_btn.setEnabled(True)
            self.export_btn.setEnabled(True)

    def play_generated_audio(self):
        if hasattr(self, 'current_audio') and os.path.exists(self.current_audio):
            self.player.setSource(QUrl.fromLocalFile(self.current_audio))
            self.player.play()

    def export_audio(self):
        if hasattr(self, 'current_audio') and os.path.exists(self.current_audio):
            import shutil
            file_path, _ = QFileDialog.getSaveFileName(self, "Export Audio", "generated_voice.wav", "Audio Files (*.wav)")
            if file_path:
                try:
                    shutil.copy2(self.current_audio, file_path)
                    QMessageBox.information(self, "Export Successful", f"Audio successfully saved to:\n{file_path}")
                except Exception as e:
                    QMessageBox.critical(self, "Export Failed", f"Failed to save audio:\n{str(e)}")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # Try to set modern style
    app.setStyle("Fusion")
    
    window = VoxCPMApp()
    window.show()
    sys.exit(app.exec())
