# Jarvis — AI assistant for Careva+

Jarvis is a personal AI assistant built on [OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
(Stanford's open-source, local-first assistant framework).
It runs **on your own computer**. Your patients' details never go to a cloud AI service.

Jarvis is set up to help with Careva+ work:

- replying to new patient and family enquiries
- follow-up reminders and WhatsApp / SMS / email drafts
- nurse and caretaker shift planning
- quotations, invoices, simple accounts
- marketing posts, staff notices, reports
- web research and reading/writing files on your computer

It remembers useful facts from your chats and keeps them only on your computer.

## Install (one time)

You need an internet connection and about 5 GB of free disk space.

**Mac, Linux, or Windows with WSL2.** Open Terminal in this `jarvis` folder and run:

```bash
bash install-jarvis.sh
```

**Windows.** Open PowerShell in this `jarvis` folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-jarvis.ps1
```

The script:

1. Runs the official OpenJarvis installer. This installs Python tools, [Ollama](https://ollama.com) (which runs the AI model), and the `qwen3.5:2b` model. Usage analytics are turned off.
2. Copies the Careva+ Jarvis personality and settings into `~/.openjarvis/` (on Windows, `%USERPROFILE%\.openjarvis\`). Any old settings are saved as `config.toml.backup`.

## Tell Jarvis about yourself

Open `~/.openjarvis/USER.md` and fill it in: your name, how Jarvis should address you, your city, services and prices, and office hours.
Jarvis reads this file every time it starts.

## Use Jarvis

Open a **new** terminal window, then:

| Command | What it does |
|---|---|
| `jarvis chat` | Talk to Jarvis in the terminal |
| `jarvis gui` | Talk to Jarvis in your web browser (needs [Node.js 22+](https://nodejs.org)) |
| `jarvis ask "..."` | Ask a single question |
| `jarvis doctor` | Check that everything is working |

Things to try:

```bash
jarvis ask "Draft a polite WhatsApp reply to a family asking for a 24-hour caretaker for their father after surgery"
jarvis ask "Make a shift plan for 3 nurses covering 5 patients this week"
jarvis ask "Write an Instagram post about our home nursing service"
```

## Make Jarvis smarter (optional)

The default model is small, so it runs on almost any laptop.
If your computer has 16 GB of RAM or more, switch to a bigger model:

```bash
ollama pull qwen3.5:9b
jarvis config set intelligence.default_model qwen3.5:9b
```

## Files in this folder

| File | Purpose |
|---|---|
| `home/SOUL.md` | Jarvis's personality and rules (edit to change how Jarvis behaves) |
| `home/USER.md` | Template for information about you |
| `home/config.toml` | Model, tools, memory and privacy settings |
| `install-jarvis.sh` / `install-jarvis.ps1` | One-command installers |

After you edit a file in `home/`, run the installer again to apply it.
It keeps your filled-in `USER.md`.
