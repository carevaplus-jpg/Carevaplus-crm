"""Safety check for Jarvis image generation: Freepik/nsfw_image_detector behind a tiny HTTP API.

POST /check   body = raw image bytes (any common format)
              optional header  Authorization: Bearer <SPACE_TOKEN>
Returns       {"safe": bool, "label": str, "scores": {label: prob}}
"""
import io
import os

from fastapi import FastAPI, HTTPException, Request
from PIL import Image
from transformers import pipeline

MODEL = os.environ.get("NSFW_MODEL", "Freepik/nsfw_image_detector")
TOKEN = os.environ.get("SPACE_TOKEN", "")          # set as a Space secret; empty = open
BLOCK_AT = float(os.environ.get("BLOCK_AT", "0.35"))  # block if medium+high probability exceeds this
# Labels that count as acceptable. Anything else is treated as NSFW (fail closed on unknown labels).
OK_LABELS = {s.strip().lower() for s in os.environ.get("OK_LABELS", "neutral,low,sfw,normal,safe").split(",")}

clf = pipeline("image-classification", model=MODEL, top_k=None)
app = FastAPI()


@app.get("/")
def health():
    return {"ok": True, "model": MODEL}


@app.post("/check")
async def check(req: Request):
    if TOKEN and req.headers.get("authorization", "") != f"Bearer {TOKEN}":
        raise HTTPException(401, "bad token")
    data = await req.body()
    if not data or len(data) > 12_000_000:
        raise HTTPException(400, "empty or too large")
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(400, "not an image")
    out = clf(img)
    scores = {r["label"]: float(r["score"]) for r in out}
    top = max(scores, key=scores.get)
    bad = sum(p for l, p in scores.items() if l.lower() not in OK_LABELS)
    safe = top.lower() in OK_LABELS and bad < BLOCK_AT
    return {"safe": safe, "label": top, "scores": scores}
