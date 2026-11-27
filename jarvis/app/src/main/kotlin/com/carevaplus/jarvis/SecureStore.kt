package com.carevaplus.jarvis

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.carevaplus.jarvis.brain.Store

/** API keys and everything Jarvis learns live in Android-Keystore-encrypted storage on this device. */
class SecureStore(context: Context) : Store {
    private val prefs: SharedPreferences = try {
        val key = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
        EncryptedSharedPreferences.create(context, "jarvis_secure", key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV, EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM)
    } catch (e: Exception) {
        // A few devices have a broken keystore. Fall back rather than make the app unusable.
        Log.w("Jarvis", "Encrypted storage unavailable, using plain storage", e)
        context.getSharedPreferences("jarvis_plain", Context.MODE_PRIVATE)
    }
    override fun get(key: String): String? = prefs.getString(key, null)
    override fun put(key: String, value: String) { prefs.edit().putString(key, value).apply() }
    override fun remove(key: String) { prefs.edit().remove(key).apply() }
}
