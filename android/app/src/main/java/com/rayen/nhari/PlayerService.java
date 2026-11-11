package com.rayen.nhari;

import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.Locale;

/**
 * Plays an event in the foreground: a list of items, each either spoken text (Arabic TTS)
 * or an audio URL — optionally a segment [s, e] in ms, repeated n times (the thumun ×10).
 * Adhan, adhkar and short audio are cached on the phone after the first play.
 */
public class PlayerService extends Service implements TextToSpeech.OnInitListener {
    static final String ACT_PLAY = "com.rayen.nhari.PLAY";
    static final String ACT_PLAY_ID = "com.rayen.nhari.PLAY_ID";
    static final String ACT_STOP = "com.rayen.nhari.STOP";

    private final Handler h = new Handler(Looper.getMainLooper());
    private final ArrayDeque<JSONObject> queue = new ArrayDeque<>();
    private JSONObject cur;
    private JSONArray items;
    private int idx = -1, rep = 0;
    private MediaPlayer mp;
    private TextToSpeech tts;
    private boolean ttsReady = false, ttsFailed = false;
    private String pendingSpeech;
    private AudioManager am;
    private AudioFocusRequest focus;
    private int token = 0; // bumps on every new item so late callbacks are ignored

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        tts = new TextToSpeech(this, this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        goForeground("Nhari", "");
        String action = intent == null ? null : intent.getAction();
        if (ACT_STOP.equals(action)) { stopAll(); return START_NOT_STICKY; }
        JSONObject ev = null;
        try {
            if (ACT_PLAY.equals(action)) ev = new JSONObject(intent.getStringExtra("event"));
            else if (ACT_PLAY_ID.equals(action)) {
                int nid = intent.getIntExtra("nid", 0);
                if (nid != 0) getSystemService(NotificationManager.class).cancel(nid);
                ev = EventStore.take(this, intent.getStringExtra("id"));
                Scheduler.scheduleNext(this);
            }
        } catch (Exception e) { ev = null; }
        if (ev == null) { if (cur == null) stopAll(); return START_NOT_STICKY; }
        if (cur != null && ev.optInt("prio", 0) > cur.optInt("prio", 0)) {
            // the adhan interrupts adhkar or recitation; the interrupted event is dropped
            releasePlayer();
            if (tts != null) tts.stop();
            queue.addFirst(ev);
            cur = null;
            playNextEvent();
        } else {
            queue.add(ev);
            if (cur == null) playNextEvent();
        }
        return START_NOT_STICKY;
    }

    private void goForeground(String title, String text) {
        if (Build.VERSION.SDK_INT >= 29) startForeground(Notifs.ID_PLAYING, Notifs.playing(this, title, text), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(Notifs.ID_PLAYING, Notifs.playing(this, title, text));
    }

    private void updateNotif(String text) {
        if (cur == null) return;
        getSystemService(NotificationManager.class).notify(Notifs.ID_PLAYING, Notifs.playing(this, cur.optString("title", "Nhari"), text));
    }

    private void playNextEvent() {
        cur = queue.poll();
        if (cur == null) { stopAll(); return; }
        items = cur.optJSONArray("items");
        if (items == null) items = new JSONArray();
        idx = -1;
        requestFocus("alarm".equals(cur.optString("stream")));
        updateNotif(cur.optString("body", ""));
        nextItem();
    }

    private void nextItem() {
        token++;
        releasePlayer();
        idx++;
        if (cur == null) return;
        if (idx >= items.length()) { abandonFocus(); playNextEvent(); return; }
        JSONObject it = items.optJSONObject(idx);
        rep = 0;
        if (it == null) { nextItem(); return; }
        if ("tts".equals(it.optString("t"))) speak(it.optString("text"));
        else playUrl(it);
    }

    /* ---------- spoken text ---------- */
    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS && tts != null) {
            int r = tts.setLanguage(new Locale("ar"));
            ttsReady = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
            tts.setAudioAttributes(attrs(cur != null && "alarm".equals(cur.optString("stream"))));
            tts.setSpeechRate(0.9f);
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { }
                @Override public void onDone(String id) { h.post(() -> { if (("u" + token).equals(id)) nextItem(); }); }
                @Override public void onError(String id) { h.post(() -> { if (("u" + token).equals(id)) nextItem(); }); }
            });
        }
        ttsFailed = !ttsReady;
        if (pendingSpeech != null) {
            String s = pendingSpeech;
            pendingSpeech = null;
            h.post(() -> speak(s));
        }
    }

    private void speak(String text) {
        if (ttsFailed) { nextItem(); return; }
        if (!ttsReady) { pendingSpeech = text; return; }
        updateNotif(text);
        Bundle p = new Bundle();
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, p, "u" + token);
    }

    /* ---------- audio ---------- */
    private AudioAttributes attrs(boolean alarm) {
        return new AudioAttributes.Builder()
                .setUsage(alarm ? AudioAttributes.USAGE_ALARM : AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
    }

    private void playUrl(JSONObject it) {
        final int my = token;
        final String url = it.optString("url");
        final int s = it.optInt("s", 0), e = it.optInt("e", 0), n = Math.max(1, it.optInt("n", 1));
        final String label = it.optString("label", "");
        File cached = cacheFile(url);
        boolean useCache = it.optBoolean("cache") && cached.exists() && cached.length() > 10_000;
        try {
            mp = new MediaPlayer();
            mp.setAudioAttributes(attrs("alarm".equals(cur.optString("stream"))));
            mp.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
            if (useCache) mp.setDataSource(cached.getAbsolutePath());
            else mp.setDataSource(this, Uri.parse(url));
            mp.setOnPreparedListener(m -> {
                if (my != token) return;
                if (s > 0) m.seekTo(s);
                m.start();
                updateNotif(progress(label, n));
                if (e > 0) watch(my, s, e, n, label);
            });
            mp.setOnCompletionListener(m -> { if (my == token) segmentDone(my, s, e, n, label); });
            mp.setOnErrorListener((m, what, extra) -> { if (my == token) h.post(this::nextItem); return true; });
            mp.prepareAsync();
        } catch (Exception ex) {
            h.post(this::nextItem);
            return;
        }
        if (it.optBoolean("cache") && !useCache) download(url, cached);
    }

    private String progress(String label, int n) {
        String t = label.isEmpty() ? cur.optString("body", "") : label;
        return n > 1 ? t + " — المرة " + (rep + 1) + "/" + n : t;
    }

    private void watch(int my, int s, int e, int n, String label) {
        h.postDelayed(new Runnable() {
            @Override public void run() {
                if (my != token || mp == null) return;
                try {
                    if (mp.isPlaying() && mp.getCurrentPosition() >= e) { segmentDone(my, s, e, n, label); return; }
                } catch (IllegalStateException ignored) { return; }
                h.postDelayed(this, 200);
            }
        }, 200);
    }

    private void segmentDone(int my, int s, int e, int n, String label) {
        if (my != token || mp == null) return;
        rep++;
        if (rep < n) {
            try {
                mp.seekTo(Math.max(0, s));
                mp.start();
                updateNotif(progress(label, n));
                if (e > 0) watch(my, s, e, n, label);
                return;
            } catch (IllegalStateException ignored) { }
        }
        h.post(this::nextItem);
    }

    private void releasePlayer() {
        if (mp != null) {
            try { mp.stop(); } catch (Exception ignored) { }
            try { mp.release(); } catch (Exception ignored) { }
            mp = null;
        }
    }

    /* ---------- cache (adhan, adhkar) ---------- */
    private File cacheFile(String url) {
        File dir = new File(getFilesDir(), "audio");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, sha1(url) + ".mp3");
    }

    private static String sha1(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] d = md.digest(s.getBytes("UTF-8"));
            StringBuilder b = new StringBuilder();
            for (byte x : d) b.append(String.format(Locale.US, "%02x", x));
            return b.toString();
        } catch (Exception e) { return Integer.toHexString(s.hashCode()); }
    }

    static void download(String url, File dest) {
        new Thread(() -> {
            File tmp = new File(dest.getAbsolutePath() + ".part");
            HttpURLConnection con = null;
            try {
                con = (HttpURLConnection) new URL(url).openConnection();
                con.setConnectTimeout(15_000);
                con.setReadTimeout(30_000);
                con.setInstanceFollowRedirects(true);
                // archive.org and others redirect across hosts: follow by hand
                int code = con.getResponseCode();
                for (int i = 0; i < 5 && code >= 300 && code < 400; i++) {
                    String loc = con.getHeaderField("Location");
                    con.disconnect();
                    con = (HttpURLConnection) new URL(new URL(url), loc).openConnection();
                    con.setConnectTimeout(15_000);
                    con.setReadTimeout(30_000);
                    code = con.getResponseCode();
                }
                if (code != 200) return;
                try (InputStream in = con.getInputStream(); FileOutputStream out = new FileOutputStream(tmp)) {
                    byte[] buf = new byte[64 * 1024];
                    int r;
                    while ((r = in.read(buf)) > 0) out.write(buf, 0, r);
                }
                if (tmp.length() > 10_000) tmp.renameTo(dest);
            } catch (Exception ignored) {
                tmp.delete();
            } finally {
                if (con != null) con.disconnect();
            }
        }).start();
    }

    /* ---------- focus & stop ---------- */
    private void requestFocus(boolean alarm) {
        if (am == null) return;
        focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(attrs(alarm))
                .setOnAudioFocusChangeListener(ch -> { })
                .build();
        am.requestAudioFocus(focus);
    }

    private void abandonFocus() {
        if (am != null && focus != null) am.abandonAudioFocusRequest(focus);
        focus = null;
    }

    private void stopAll() {
        token++;
        queue.clear();
        cur = null;
        releasePlayer();
        if (tts != null) tts.stop();
        abandonFocus();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        token++;
        releasePlayer();
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
        abandonFocus();
        super.onDestroy();
    }

    static JSONObject quickEvent(String title, String text) {
        JSONObject e = new JSONObject();
        try {
            e.put("id", "test-" + System.currentTimeMillis());
            e.put("kind", "audio");
            e.put("title", title);
            JSONArray a = new JSONArray();
            a.put(new JSONObject().put("t", "tts").put("text", text));
            e.put("items", a);
        } catch (JSONException ignored) { }
        return e;
    }
}
