package io.github.goodjwc.sgenglish;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 웹앱(assets = sg-english/)을 WebView로 띄우는 오프라인 안드로이드 앱.
 *
 * - 파일은 https://appassets.androidplatform.net/ 주소로 앱 안에서 제공한다
 *   (https 주소라야 WebView에서 마이크 녹음이 허용된다)
 * - WebView에는 브라우저 음성 합성이 없으므로, 폰의 TTS 엔진을 JS 브리지(AndroidBridge)로 연결한다
 */
public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    private static final String TAG = "SGEnglish";
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final int REQ_MIC = 1;

    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private PermissionRequest pendingPermission;
    private boolean selftestStarted = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                 // 학습 기록(localStorage)
        s.setMediaPlaybackRequiresUserGesture(false); // 녹음 재생
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (HOST.equals(url.getHost())) return serveAsset(url.getPath());
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (HOST.equals(url.getHost())) return false;
                // 앱 밖 링크는 외부 브라우저로
                try { startActivity(new Intent(Intent.ACTION_VIEW, url)); } catch (Exception ignored) { }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                maybeRunSelftest();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handlePermissionRequest(request));
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                String msg = m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")";
                if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR) Log.e(TAG + "JS", msg);
                else Log.i(TAG + "JS", msg);
                return true;
            }
        });

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        tts = new TextToSpeech(this, this);

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);
    }

    // ---------- 앱 안의 파일 제공 ----------

    private WebResourceResponse serveAsset(String path) {
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        String name = path.substring(1);
        try {
            InputStream in = getAssets().open(name);
            HashMap<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mimeType(name), "UTF-8", 200, "OK", headers, in);
        } catch (IOException e) {
            Log.w(TAG, "asset not found: " + name);
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                    new HashMap<>(), new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mimeType(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".html")) return "text/html";
        if (n.endsWith(".js")) return "application/javascript";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".json") || n.endsWith(".webmanifest")) return "application/json";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".svg")) return "image/svg+xml";
        return "text/plain";
    }

    // ---------- 마이크 권한 ----------

    private void handlePermissionRequest(PermissionRequest request) {
        List<String> res = Arrays.asList(request.getResources());
        if (!res.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            if (pendingPermission != null) pendingPermission.deny();
            pendingPermission = request;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != REQ_MIC || pendingPermission == null) return;
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (granted) pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        else pendingPermission.deny();
        pendingPermission = null;
    }

    // ---------- TTS ----------

    @Override
    public void onInit(int status) {
        ttsReady = status == TextToSpeech.SUCCESS;
        Log.i(TAG, "TTS init status=" + status);
        if (!ttsReady) return;
        tts.setLanguage(Locale.US);
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) { }
            @Override public void onDone(String id) { Log.i(TAG, "TTS done " + id); notifyDone(id); }
            @Override public void onError(String id) { Log.w(TAG, "TTS error " + id); notifyDone(id); }
            @Override public void onStop(String id, boolean interrupted) { notifyDone(id); }
        });
        js("window.__ttsReady && window.__ttsReady()");
    }

    private void notifyDone(String id) {
        js("window.__ttsDone && window.__ttsDone(" + JSONObject.quote(id) + ")");
    }

    private void js(final String code) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(code, null); });
    }

    /** 오프라인 사용이 가능한 영어 음성을 앞쪽에 둔 목록 */
    private List<Voice> englishVoices() {
        List<Voice> offline = new ArrayList<>();
        List<Voice> online = new ArrayList<>();
        if (!ttsReady) return offline;
        Set<Voice> voices;
        try { voices = tts.getVoices(); } catch (Exception e) { voices = null; }
        if (voices == null) return offline;
        for (Voice v : voices) {
            if (v.getLocale() == null || !"en".equals(v.getLocale().getLanguage())) continue;
            Set<String> f = v.getFeatures();
            if (f != null && f.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
            (v.isNetworkConnectionRequired() ? online : offline).add(v);
        }
        offline.sort((a, b) -> a.getName().compareTo(b.getName()));
        online.sort((a, b) -> a.getName().compareTo(b.getName()));
        offline.addAll(online);
        return offline;
    }

    /** JS에서 window.AndroidBridge 로 호출 */
    private class Bridge {
        @JavascriptInterface
        public boolean isReady() { return ttsReady; }

        @JavascriptInterface
        public String getVoices() {
            JSONArray arr = new JSONArray();
            try {
                for (Voice v : englishVoices()) {
                    JSONObject o = new JSONObject();
                    o.put("name", v.getName());
                    o.put("lang", v.getLocale().toLanguageTag());
                    o.put("offline", !v.isNetworkConnectionRequired());
                    arr.put(o);
                }
            } catch (Exception e) {
                Log.w(TAG, "getVoices failed", e);
            }
            return arr.toString();
        }

        @JavascriptInterface
        public void speak(String text, float rate, String voiceName, String id) {
            if (!ttsReady) { notifyDone(id); return; }
            Voice chosen = null;
            if (voiceName != null && !voiceName.isEmpty()) {
                for (Voice v : englishVoices()) if (v.getName().equals(voiceName)) { chosen = v; break; }
            }
            if (chosen != null) tts.setVoice(chosen);
            else tts.setLanguage(Locale.US);
            tts.setSpeechRate(rate);
            Bundle params = new Bundle();
            int r = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id);
            if (r != TextToSpeech.SUCCESS) notifyDone(id);
        }

        @JavascriptInterface
        public void stop() { if (ttsReady) tts.stop(); }
    }

    // ---------- CI 자동 점검 (am start --ez selftest true 로 실행했을 때만) ----------

    private void maybeRunSelftest() {
        if (selftestStarted || !getIntent().getBooleanExtra("selftest", false)) return;
        selftestStarted = true;
        final String code = readRaw(R.raw.selftest);
        web.postDelayed(() -> web.evaluateJavascript(code, null), 3000);
    }

    private String readRaw(int id) {
        try (InputStream in = getResources().openRawResource(id)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (IOException e) {
            return "console.error('selftest load failed')";
        }
    }

    // ---------- 생명주기 ----------

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (ttsReady) tts.stop();
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
