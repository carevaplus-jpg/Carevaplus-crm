// JNI bridge between the Jarvis Android app and llama.cpp (runs the AI model on the phone).
// Java side: com.carevaplus.jarvis.LlamaNative
#include <jni.h>
#include <atomic>
#include <string>
#include <vector>
#include <algorithm>
#include "llama.h"

namespace {

struct Session {
    llama_model *   model = nullptr;
    llama_context * ctx   = nullptr;
    const llama_vocab * vocab = nullptr;
    llama_batch_ext * batch = nullptr;
    int32_t n_batch = 512;
    std::atomic<bool> stop{false};
};

void quiet_log(enum ggml_log_level level, const char * text, void *) {
    (void) level; (void) text;  // keep logcat clean; errors surface as return codes
}

void fill_batch(llama_batch_ext * batch, const llama_token * toks, int32_t n, llama_pos pos0, bool logits_last) {
    llama_batch_ext_clear(batch);
    for (int32_t i = 0; i < n; ++i) {
        const int32_t idx = llama_batch_ext_add_token(batch, 0, toks[i]);
        const llama_pos pos = pos0 + i;
        llama_batch_ext_set_pos(batch, idx, &pos);
    }
    if (logits_last && n > 0) llama_batch_ext_set_output_logits(batch, n - 1, true);
}

jbyteArray to_bytes(JNIEnv * env, const std::string & s) {
    jbyteArray arr = env->NewByteArray((jsize) s.size());
    if (arr && !s.empty()) env->SetByteArrayRegion(arr, 0, (jsize) s.size(), (const jbyte *) s.data());
    return arr;
}

std::string jstring_utf8(JNIEnv * env, jbyteArray bytes) {
    jsize n = env->GetArrayLength(bytes);
    std::string s((size_t) n, '\0');
    if (n > 0) env->GetByteArrayRegion(bytes, 0, n, (jbyte *) &s[0]);
    return s;
}

} // namespace

extern "C" {

// Returns a native handle, or 0 if the model could not be loaded.
JNIEXPORT jlong JNICALL
Java_com_carevaplus_jarvis_LlamaNative_load(JNIEnv * env, jclass, jstring jpath, jint n_ctx, jint n_threads) {
    static bool backend_ready = false;
    if (!backend_ready) {
        llama_log_set(quiet_log, nullptr);
        llama_backend_init();
        backend_ready = true;
    }
    const char * path = env->GetStringUTFChars(jpath, nullptr);
    llama_model_params mp = llama_model_default_params();
    mp.n_gpu_layers = 0;  // CPU only: works on every phone
    llama_model * model = llama_model_load_from_file(path, mp);
    env->ReleaseStringUTFChars(jpath, path);
    if (!model) return 0;

    llama_context_params cp = llama_context_default_params();
    cp.n_ctx = (uint32_t) n_ctx;
    cp.n_batch = 512;
    cp.n_threads = n_threads;
    cp.n_threads_batch = n_threads;
    llama_context * ctx = llama_init_from_model(model, cp);
    if (!ctx) { llama_model_free(model); return 0; }

    auto * s = new Session();
    s->model = model;
    s->ctx = ctx;
    s->vocab = llama_model_get_vocab(model);
    s->batch = llama_batch_ext_init(ctx);
    s->n_batch = (int32_t) cp.n_batch;
    return (jlong) s;
}

JNIEXPORT jint JNICALL
Java_com_carevaplus_jarvis_LlamaNative_contextSize(JNIEnv *, jclass, jlong h) {
    auto * s = (Session *) h;
    return s ? (jint) llama_n_ctx(s->ctx) : 0;
}

// Number of tokens in UTF-8 text (used by Java to keep the conversation inside the context window).
JNIEXPORT jint JNICALL
Java_com_carevaplus_jarvis_LlamaNative_countTokens(JNIEnv * env, jclass, jlong h, jbyteArray jtext) {
    auto * s = (Session *) h;
    if (!s) return -1;
    std::string text = jstring_utf8(env, jtext);
    return -llama_tokenize(s->vocab, text.c_str(), (int32_t) text.size(), nullptr, 0, true, true);
}

// Generates a reply to a fully formatted prompt (UTF-8 bytes). Calls sink.onBytes(byte[]) with each new
// piece of text as it is produced, and returns the whole reply as UTF-8 bytes (null on error).
JNIEXPORT jbyteArray JNICALL
Java_com_carevaplus_jarvis_LlamaNative_generate(JNIEnv * env, jclass, jlong h, jbyteArray jprompt,
                                                jint max_tokens, jfloat temperature, jobject sink) {
    auto * s = (Session *) h;
    if (!s) return nullptr;
    s->stop = false;

    jmethodID on_bytes = nullptr;
    if (sink) {
        jclass cls = env->GetObjectClass(sink);
        on_bytes = env->GetMethodID(cls, "onBytes", "([B)V");
    }

    std::string prompt = jstring_utf8(env, jprompt);
    const int32_t n_prompt = -llama_tokenize(s->vocab, prompt.c_str(), (int32_t) prompt.size(), nullptr, 0, true, true);
    if (n_prompt <= 0) return nullptr;
    std::vector<llama_token> toks((size_t) n_prompt);
    if (llama_tokenize(s->vocab, prompt.c_str(), (int32_t) prompt.size(), toks.data(), n_prompt, true, true) < 0) return nullptr;

    const int32_t n_ctx = (int32_t) llama_n_ctx(s->ctx);
    if (n_prompt + 8 >= n_ctx) return nullptr;
    const int32_t budget = std::min<int32_t>(max_tokens, n_ctx - n_prompt - 1);

    // Fresh conversation every call: Java sends the whole (trimmed) history each time.
    llama_memory_clear(llama_get_memory(s->ctx), true);

    // Process the prompt in chunks of n_batch; only the last token needs logits.
    for (int32_t i = 0; i < n_prompt; i += s->n_batch) {
        const int32_t n = std::min(s->n_batch, n_prompt - i);
        fill_batch(s->batch, toks.data() + i, n, i, i + n == n_prompt);
        if (llama_process(s->ctx, LLAMA_PROCESS_TYPE_DECODE, s->batch) != 0) return nullptr;
        if (s->stop) return to_bytes(env, "");
    }

    llama_sampler * smpl = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler_chain_add(smpl, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(smpl, llama_sampler_init_top_p(0.9f, 1));
    llama_sampler_chain_add(smpl, llama_sampler_init_penalties(llama_vocab_n_tokens(s->vocab), 64, 1.1f, 0.0f, 0.0f));
    llama_sampler_chain_add(smpl, llama_sampler_init_temp(temperature));
    llama_sampler_chain_add(smpl, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

    std::string out;
    llama_pos pos = n_prompt;
    for (int32_t i = 0; i < budget && !s->stop; ++i) {
        llama_token tok = llama_sampler_sample(smpl, s->ctx, -1);
        if (llama_vocab_is_eog(s->vocab, tok)) break;
        char buf[256];
        int n = llama_token_to_piece(s->vocab, tok, buf, sizeof(buf), 0, false);
        if (n > 0) {
            std::string piece(buf, (size_t) n);
            out += piece;
            if (on_bytes) {
                jbyteArray arr = to_bytes(env, piece);
                env->CallVoidMethod(sink, on_bytes, arr);
                env->DeleteLocalRef(arr);
                if (env->ExceptionCheck()) { env->ExceptionClear(); s->stop = true; }
            }
        }
        fill_batch(s->batch, &tok, 1, pos, true);
        if (llama_process(s->ctx, LLAMA_PROCESS_TYPE_DECODE, s->batch) != 0) break;
        ++pos;
    }
    llama_sampler_free(smpl);
    return to_bytes(env, out);
}

JNIEXPORT void JNICALL
Java_com_carevaplus_jarvis_LlamaNative_stop(JNIEnv *, jclass, jlong h) {
    auto * s = (Session *) h;
    if (s) s->stop = true;
}

JNIEXPORT void JNICALL
Java_com_carevaplus_jarvis_LlamaNative_free(JNIEnv *, jclass, jlong h) {
    auto * s = (Session *) h;
    if (!s) return;
    if (s->batch) llama_batch_ext_free(s->batch);
    if (s->ctx) llama_free(s->ctx);
    if (s->model) llama_model_free(s->model);
    delete s;
}

} // extern "C"
