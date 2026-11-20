package com.carevaplus.jarvis;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Downloads the on-phone model with resume support (a 1.3 GB file on mobile networks). */
final class ModelDownloader {
    interface Progress { void onProgress(long done, long total); }

    private volatile boolean cancelled;

    void cancel() { cancelled = true; }

    void download(String url, File dest, long expectedBytes, Progress progress) throws JarvisClient.JarvisException {
        File part = new File(dest.getPath() + ".part");
        long have = part.isFile() ? part.length() : 0;
        if (dest.getParentFile() != null) dest.getParentFile().mkdirs();
        if (dest.getParentFile() != null && dest.getParentFile().getUsableSpace() < (expectedBytes - have) + 50_000_000L) {
            throw new JarvisClient.JarvisException("Not enough free space. The AI model needs about 1.4 GB.");
        }
        HttpURLConnection conn = null;
        try {
            String next = url;
            // Follow redirects manually (Hugging Face redirects to a CDN on another host).
            for (int hops = 0; ; hops++) {
                conn = (HttpURLConnection) new URL(next).openConnection();
                conn.setInstanceFollowRedirects(false);
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(60000);
                if (have > 0) conn.setRequestProperty("Range", "bytes=" + have + "-");
                int code = conn.getResponseCode();
                if (code >= 300 && code < 400 && hops < 8) {
                    String loc = conn.getHeaderField("Location");
                    conn.disconnect();
                    next = new URL(new URL(next), loc).toString();
                    continue;
                }
                if (code == 416) { have = part.length(); break; } // already complete
                if (code == 200) have = 0;                          // server ignored Range: start over
                else if (code != 206) throw new JarvisClient.JarvisException("Download failed (error " + code + "). Try again later.");
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(part, have > 0)) {
                    byte[] buf = new byte[1 << 16];
                    long done = have;
                    long lastReport = 0;
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        if (cancelled) throw new JarvisClient.JarvisException("Download paused. Tap Download again to continue.");
                        out.write(buf, 0, n);
                        done += n;
                        if (done - lastReport > 2_000_000) { progress.onProgress(done, expectedBytes); lastReport = done; }
                    }
                    progress.onProgress(done, expectedBytes);
                }
                break;
            }
        } catch (IOException e) {
            throw new JarvisClient.JarvisException("Download interrupted (" + e.getMessage() + "). Tap Download again to continue where it stopped.");
        } finally {
            if (conn != null) conn.disconnect();
        }
        if (part.length() != expectedBytes) {
            if (part.length() > expectedBytes) part.delete();
            throw new JarvisClient.JarvisException("Download incomplete. Tap Download again to continue.");
        }
        if (!part.renameTo(dest)) throw new JarvisClient.JarvisException("Could not save the model file.");
    }
}
