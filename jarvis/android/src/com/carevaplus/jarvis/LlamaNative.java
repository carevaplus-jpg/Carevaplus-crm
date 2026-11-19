package com.carevaplus.jarvis;

/** JNI bindings to libjarvis_llama.so (llama.cpp). All text crosses as UTF-8 bytes. */
final class LlamaNative {
    private LlamaNative() {}

    static volatile Throwable loadError;

    static {
        // Fast build for phones with ARM dot-product instructions, compatible build otherwise.
        String lib = cpuHasDotProd() ? "jarvis_llama" : "jarvis_llama_compat";
        try { System.loadLibrary(lib); }
        catch (Throwable t) { loadError = t; }
    }

    static boolean cpuHasDotProd() {
        try (java.io.BufferedReader r = new java.io.BufferedReader(new java.io.FileReader("/proc/cpuinfo"))) {
            String line;
            while ((line = r.readLine()) != null) {
                if (line.startsWith("Features") && line.contains(" asimddp")) return true;
            }
        } catch (java.io.IOException ignored) { }
        return false;
    }

    interface ByteSink { void onBytes(byte[] piece); }

    static native long load(String modelPath, int nCtx, int nThreads);
    static native int contextSize(long handle);
    static native int countTokens(long handle, byte[] utf8);
    static native byte[] generate(long handle, byte[] promptUtf8, int maxTokens, float temperature, ByteSink sink);
    static native void stop(long handle);
    static native void free(long handle);
}
