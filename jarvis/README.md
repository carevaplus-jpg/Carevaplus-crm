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

<p align="center"><img src="docs/demo-phone.png" width="300" alt="Jarvis answering a caretaker enquiry on a phone-sized screen"></p>
<p align="center"><i>A real reply from Jarvis (qwen3.5:2b model), shown on a phone-sized screen.</i></p>

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
| `jarvis gui` | Talk to Jarvis in your web browser (see note below) |
| `jarvis ask "..."` | Ask a single question |
| `jarvis doctor` | Check that everything is working |

Things to try:

```bash
jarvis ask "Draft a polite WhatsApp reply to a family asking for a 24-hour caretaker for their father after surgery"
jarvis ask "Make a shift plan for 3 nurses covering 5 patients this week"
jarvis ask "Write an Instagram post about our home nursing service"
```

**Browser app (`jarvis gui`)** needs [Node.js 22](https://nodejs.org) and npm 11.
Node 22 comes with npm 10, so run `npm install -g npm@11` once first.
When the app first opens it asks about sharing usage data. Choose **Continue without sharing**.

## Android app (APK)

<img src="android/icon.png" width="72" align="right" alt="Jarvis app icon">

The **Jarvis** Android app is a chat screen for the Jarvis running on your computer, with voice.

- Type or tap 🎤 to speak. Jarvis can read its replies aloud (turn this off in ⚙).
- Long-press a reply to **copy** it or **share** it straight to WhatsApp, SMS or email.
- **New** starts a fresh conversation.

The phone does not run the AI. It needs your computer switched on, with your phone **on the same Wi-Fi**.

**1. On your computer** (one time), create an access key so only you can connect:

```bash
jarvis auth create-key        # prints a key starting with oj_sk_  - keep it private
```

Then start Jarvis so your phone can reach it. Run this every time you want to use the app:

```bash
jarvis serve --host 0.0.0.0
```

If Windows asks whether to let Python through the firewall, choose **Allow** for **private networks**.

**2. Find your computer's address**

- Windows: run `ipconfig` and use the **IPv4 Address**, for example `192.168.1.5`.
- Mac: System Settings → Wi-Fi → Details → IP address.
- Linux: run `hostname -I`.

**3. Install the app on your Android phone**

1. On the phone, open this repository on GitHub and download [`android/Jarvis-Careva.apk`](android/Jarvis-Careva.apk).
2. Open the downloaded file. If Android asks, allow your browser to **install unknown apps**.
3. Open **Jarvis**, tap ⚙, enter the address and the key, and tap **Save & connect**.
   The top bar shows **● Online** when it works.

Things to know:

- **Use it at home or in the office only.** It works on the same Wi-Fi only. Away from home, use Telegram (below).
- **Avoid public Wi-Fi.** Messages travel unencrypted over your Wi-Fi, so use it only on Wi-Fi you trust.
- **The browser app needs the key too.** After you create a key, paste the same key into the browser app's Settings (`jarvis gui`).
- **Answers can be slow.** A small model on a slow computer can take a minute or more per answer.
- Needs Android 7.0 or newer. To rebuild the app from source, see `android/build.sh`.

## Use Jarvis on your phone (Telegram)

Works on Android and iPhone, at home or outside. Jarvis runs on your computer, and your phone talks to it through a private Telegram bot.

1. Install the free **Telegram** app on your phone.
2. On your computer, in this `jarvis` folder, run:
   - Mac / Linux: `bash setup-phone.sh`
   - Windows: `powershell -ExecutionPolicy Bypass -File .\setup-phone.ps1`

   The script tells you how to create your bot with **@BotFather** and find your ID with **@userinfobot**.
   Then it asks you to paste both.
3. Start Jarvis on your computer and leave it running:

   ```bash
   jarvis serve
   ```

4. On your phone, open your new bot in Telegram and type "Hi Jarvis".

Things to know:

- Only **your** Telegram account can talk to your Jarvis. Messages from anyone else are ignored.
- Your computer must stay switched on and awake, with `jarvis serve` running.
- The AI still runs on your computer, but messages travel through Telegram's servers.
  Avoid sending sensitive patient medical details over Telegram.
- To turn phone access off: `jarvis config set channel.enabled false`

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
| `setup-phone.sh` / `setup-phone.ps1` | Connect Jarvis to Telegram for phone use |
| `android/Jarvis-Careva.apk` | Android app (source in `android/src`, built with `android/build.sh`) |

After you edit a file in `home/`, run the installer again to apply it.
It keeps your filled-in `USER.md`.
