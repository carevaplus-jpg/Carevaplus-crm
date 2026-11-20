# Careva+ intro video (Tamil)

A Tamil-language intro to Careva+ home health care. 16:9, 1920×1080, 30 fps, about 35 seconds.

- **Voice:** Microsoft neural Tamil voice `ta-IN-PallaviNeural` (see `video.json`; needs `pip install edge-tts`).
- **Text:** Tamil subtitles that match the voice; headings in Tamil with a small English line.
- **Logo:** `images/careva-logo.png`, the Careva+ logo cut out of its white background; shown in the corner, as the hero in scene 1 and on the closing card.
- **Picture:** an AI-generated photo of a home-care nurse (`images/nurse.jpg`, made with Canva). Swap in a real Careva+ nurse photo with the same file name when you have one.

Build from this folder (see `../engine/README.md`):

```bash
node ../engine/build.cjs . tts     # Tamil voice, timeline, subtitles
node ../engine/build.cjs . video   # careva-plus-intro.mp4
```

The narration line under each scene heading is what the voice says and what the subtitles show. One line per scene; sentences end in `.`, `!` or `?`. "Careva+", "CRM" and "AI" are spoken the way `sayAs` in `video.json` spells them.

**1. Welcome** (nurse photo; "Careva+"; வணக்கம்; three service chips)
வணக்கம்! Careva+ உங்களை அன்புடன் வரவேற்கிறது. நம்பகமான வீட்டு மருத்துவ சேவை, உங்கள் வீட்டு வாசலிலேயே.

**2. Care at home** (care team card; each row ticks as it is spoken)
பயிற்சி பெற்ற செவிலியர்களும் பராமரிப்பாளர்களும் உங்கள் வீட்டிற்கே வருகிறார்கள். ஒவ்வொரு நோயாளிக்கும் பாதுகாப்பான, தனிப்பட்ட கவனிப்பு.

**3. Our promise** (three words, one per beat: அன்பு, நம்பிக்கை, தொழில்முறை)
அன்பு. நம்பிக்கை. தொழில்முறை. இதுவே எங்கள் வாக்குறுதி.

**4. Smart CRM** (CRM mock: an enquiry is saved, a follow-up task pops up, the lead becomes a patient)
ஒவ்வொரு விசாரணையும் எங்கள் ஸ்மார்ட் CRM-இல் உடனே பதிவாகிறது. பின்தொடர்தல் பணி தானாகவே உருவாகிறது. எனவே எந்தக் குடும்பமும் காத்திருக்க வேண்டியதில்லை.

**5. Close** (nurse photo; "Careva+"; tagline; book a home visit)
Careva+. அன்பான கவனிப்பு, உங்கள் வீட்டிலேயே. இன்றே வீட்டு வருகையை முன்பதிவு செய்யுங்கள்!
