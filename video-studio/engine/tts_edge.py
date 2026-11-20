# Speak one sentence with a Microsoft Edge neural voice (edge-tts), for languages Kokoro does not cover, such as Tamil.
#   python tts_edge.py <voice> <rate> <text> <out.mp3>     (needs: pip install edge-tts)
# Run by tts.mjs when video.json has "tts": { "engine": "edge", ... }.
import os, sys
import certifi
# Behind a TLS-intercepting proxy, trust the CA bundle named by SSL_CERT_FILE (edge-tts otherwise uses certifi's store).
if os.environ.get("SSL_CERT_FILE"):
    certifi.where = lambda: os.environ["SSL_CERT_FILE"]
import edge_tts

voice, rate, text, out = sys.argv[1:5]
edge_tts.Communicate(text, voice, rate=rate).save_sync(out)
