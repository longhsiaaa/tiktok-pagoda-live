"""
VieNeu-TTS Server for TikTok Pagoda Live (Lễ Chùa Dâng Hương Online)
Giọng đọc: Nam Chuẩn Hà Nội (Thanh Bình) - VieNeu-TTS v3 Turbo 48kHz
Tác giả: LongNH (longnh.com)
"""

import sys
import io
import os
import hashlib

# Đảm bảo UTF-8 cho Windows stdout/stderr
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI, Query, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import soundfile as sf
from vieneu import Vieneu

app = FastAPI(title="VieNeu-TTS Pagoda Voice Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Bộ nhớ đệm âm thanh (Audio Memory Cache) giúp phản hồi tức thì 1ms cho câu lặp lại
audio_cache = {}

print("====================================================")
print("[VieNeu-TTS] Dang khoi tao VieNeu-TTS Engine (v3 Turbo 48kHz)...")
print("[VieNeu-TTS] Giong doc mac dinh: Nam Chuan Ha Noi (Thanh Binh)")
print("====================================================")

try:
    tts_engine = Vieneu(mode="v3turbo")
    print("[VieNeu-TTS] VieNeu-TTS v3 Turbo da san sang tai cong 5050!")
except Exception as e:
    print(f"[VieNeu-TTS] Khong the tai v3turbo, thu v3nano: {e}")
    tts_engine = Vieneu(mode="v3nano")
    print("[VieNeu-TTS] VieNeu-TTS v3 Nano da san sang!")

@app.get("/status")
def get_status():
    return {
        "status": "online",
        "engine": "VieNeu-TTS",
        "voice": "Thanh Bình (Nam Chuẩn Hà Nội)",
        "sample_rate": getattr(tts_engine, "sample_rate", 48000),
        "cache_size": len(audio_cache)
    }

@app.get("/tts")
def text_to_speech(
    text: str = Query(..., description="Văn bản cần đọc"),
    voice: str = Query("Thanh Bình", description="Tên giọng đọc (Thanh Bình, Binh...)")
):
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")

    # Kiểm tra bộ nhớ đệm
    cache_key = hashlib.md5(f"{clean_text}_{voice}".encode("utf-8")).hexdigest()
    if cache_key in audio_cache:
        return Response(content=audio_cache[cache_key], media_type="audio/wav")

    try:
        # Tổng hợp giọng đọc bằng VieNeu-TTS
        audio_data = tts_engine.infer(
            text=clean_text,
            voice=voice
        )

        # Ghi vào WAV buffer 48kHz chất lượng cao
        buf = io.BytesIO()
        sf.write(buf, audio_data, tts_engine.sample_rate, format="WAV")
        wav_bytes = buf.getvalue()

        # Lưu cache nếu câu vừa phải (< 150 ký tự)
        if len(clean_text) < 150 and len(audio_cache) < 100:
            audio_cache[cache_key] = wav_bytes

        return Response(content=wav_bytes, media_type="audio/wav")
    except Exception as err:
        print(f"[VieNeu-TTS] Loi tong hop giong doc: {err}")
        raise HTTPException(status_code=500, detail=str(err))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5050, log_level="warning")
