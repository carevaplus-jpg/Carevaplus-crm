package com.carevaplus.jarvis;

import android.os.Handler;
import android.os.Looper;

import java.io.File;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** The on-phone model download, shared by the chat and settings screens. */
final class ModelDownloads {
    interface Watcher { void onChange(); }

    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();
    private static final Handler UI = new Handler(Looper.getMainLooper());
    private static final Set<Watcher> WATCHERS = new CopyOnWriteArraySet<>();
    private static ModelDownloader current;

    static volatile boolean running;
    static volatile int percent;
    static volatile String status = "";
    static volatile String lastResult = "";   // message from the last finished download
    static volatile boolean lastOk;

    private ModelDownloads() {}

    static void watch(Watcher w) { WATCHERS.add(w); }
    static void unwatch(Watcher w) { WATCHERS.remove(w); }

    private static void changed() { UI.post(() -> { for (Watcher w : WATCHERS) w.onChange(); }); }

    static synchronized void start(File dest) {
        if (running) return;
        running = true;
        percent = 0;
        status = "Starting download…";
        lastResult = "";
        final ModelDownloader d = new ModelDownloader();
        current = d;
        changed();
        EXEC.execute(() -> {
            try {
                d.download(LocalBrain.MODEL_URL, dest, LocalBrain.MODEL_BYTES, (done, total) -> {
                    percent = (int) (done * 100 / total);
                    status = String.format(Locale.US, "Downloading %d%% (%d of %d MB)", percent, done / 1_000_000, total / 1_000_000);
                    changed();
                });
                lastOk = true;
                lastResult = "Download complete. Jarvis can now work on this phone without internet.";
            } catch (JarvisClient.JarvisException e) {
                lastOk = false;
                lastResult = e.getMessage();
            }
            running = false;
            current = null;
            changed();
        });
    }

    static synchronized void cancel() { if (current != null) current.cancel(); }
}
