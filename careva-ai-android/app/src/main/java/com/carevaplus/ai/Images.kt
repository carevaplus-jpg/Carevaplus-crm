package com.carevaplus.ai

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/** Downloads generated pictures once and keeps them in the app's cache, so chats open instantly the next time. */
object ImageCache {
    private fun file(ctx: Context, url: String): File {
        val name = MessageDigest.getInstance("SHA-1").digest(url.toByteArray()).joinToString("") { "%02x".format(it) }
        return File(File(ctx.cacheDir, "images").apply { mkdirs() }, "$name.jpg")
    }

    /** The picture at [url], downloading it if needed (it is created on first request, which takes a few seconds). Blocking. */
    fun load(ctx: Context, url: String): Bitmap? {
        val f = file(ctx, url)
        if (f.exists() && f.length() > 0) BitmapFactory.decodeFile(f.path)?.let { return it }
        repeat(2) { attempt ->
            try {
                val c = URL(url).openConnection() as HttpURLConnection
                c.connectTimeout = 20_000; c.readTimeout = 120_000
                try {
                    if (c.responseCode == 200) {
                        val tmp = File(f.parentFile, f.name + ".part")
                        c.inputStream.use { input -> tmp.outputStream().use { input.copyTo(it) } }
                        if (tmp.renameTo(f)) BitmapFactory.decodeFile(f.path)?.let { return it }
                    }
                } finally { c.disconnect() }
            } catch (_: Exception) {}
            if (attempt == 0) Thread.sleep(1500)
        }
        return null
    }

    /** Saves the picture to the phone's gallery (Pictures/Careva+). Returns its address, or null if not possible. */
    fun saveToGallery(ctx: Context, url: String): Uri? {
        val f = file(ctx, url)
        if (!f.exists()) return null
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "careva-${System.currentTimeMillis()}.jpg")
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Careva+")
        }
        val uri = ctx.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return null
        ctx.contentResolver.openOutputStream(uri)?.use { out -> f.inputStream().use { it.copyTo(out) } }
        return uri
    }

    /** Opens the share sheet for the picture (saved to the gallery first; older phones share the link instead). */
    fun share(ctx: Context, url: String) {
        val uri = saveToGallery(ctx, url)
        val send = if (uri != null) Intent(Intent.ACTION_SEND).setType("image/jpeg").putExtra(Intent.EXTRA_STREAM, uri)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        else Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, url)
        ctx.startActivity(Intent.createChooser(send, "Share image").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
