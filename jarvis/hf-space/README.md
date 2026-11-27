---
title: Jarvis Image Safety
sdk: docker
app_port: 7860
---
# Jarvis image safety check
Wraps `Freepik/nsfw_image_detector`. Deploy: create a new **Docker** Space on huggingface.co, upload these 4 files,
add a Space secret `SPACE_TOKEN` (any long random string), wait for "Running", then in Jarvis → Settings enter the
Space URL (`https://<user>-<space>.hf.space`) and that token. Check the model's labels at `/check` once and adjust
`OK_LABELS` / `BLOCK_AT` if needed.
