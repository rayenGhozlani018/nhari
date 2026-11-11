package com.rayen.nhari;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;

/** The app itself is the Nhari web app (same as on the PC and the site), shown full screen. */
public class MainActivity extends Activity {
    static final String HOME = "https://rayenghozlani018.github.io/nhari/index.html";
    static final String HOST = "rayenghozlani018.github.io";
    static final int REQ_FILE = 11, REQ_NOTIF = 12, REQ_LOC = 13;

    WebView web;
    private ValueCallback<Uri[]> fileCb;
    private GeolocationPermissions.Callback geoCb;
    private String geoOrigin;
    private String sharedJson; // screenshots shared from the gallery, picked up by the web app
    private boolean loaded = false;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Notifs.channels(this);
        Voice.check(this);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0E1630"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " NhariAndroid/" + BuildConfig.VERSION_NAME);
        web.addJavascriptInterface(new Bridge(this), "NhariAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equalsIgnoreCase(u.getHost())) return false;
                openExternal(u);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                loaded = true;
                if (sharedJson != null) notifyWeb("NhariNativeSharePending");
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try {
                    Intent i = p.createIntent();
                    if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(i, REQ_FILE);
                } catch (Exception e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    cb.invoke(origin, true, false);
                    return;
                }
                geoCb = cb;
                geoOrigin = origin;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOC);
            }
        });

        if (state != null) web.restoreState(state);
        else web.loadUrl(HOME);
        readShare(getIntent());
    }

    void openExternal(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
        catch (Exception ignored) { }
    }

    void notifyWeb(String fn) {
        runOnUiThread(() -> web.evaluateJavascript("window." + fn + " && window." + fn + "()", null));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readShare(intent);
        if (loaded && sharedJson != null) notifyWeb("NhariNativeSharePending");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (Voice.status == null || "missing".equals(Voice.status)) Voice.check(this);
        if (loaded) notifyWeb("NhariNativeResume");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /* ---------- screenshots shared from the gallery ---------- */
    private void readShare(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) return;
        try {
            JSONArray files = new JSONArray();
            ArrayList<Uri> uris = new ArrayList<>();
            if (Intent.ACTION_SEND.equals(action)) {
                Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (u != null) uris.add(u);
            } else {
                ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (list != null) uris.addAll(list);
            }
            for (int i = 0; i < uris.size() && i < 5; i++) {
                Uri u = uris.get(i);
                String type = getContentResolver().getType(u);
                byte[] data = readAll(u, 12 * 1024 * 1024);
                if (data == null) continue;
                files.put(new JSONObject().put("type", type == null ? "image/jpeg" : type).put("data", Base64.encodeToString(data, Base64.NO_WRAP)));
            }
            JSONObject o = new JSONObject().put("files", files);
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) o.put("text", text);
            if (files.length() > 0 || text != null) sharedJson = o.toString();
        } catch (Exception ignored) { }
    }

    private byte[] readAll(Uri u, int max) {
        try (InputStream in = getContentResolver().openInputStream(u)) {
            if (in == null) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[64 * 1024];
            int r;
            while ((r = in.read(buf)) > 0) {
                out.write(buf, 0, r);
                if (out.size() > max) return null;
            }
            return out.toByteArray();
        } catch (Exception e) { return null; }
    }

    String takeShared() {
        String s = sharedJson;
        sharedJson = null;
        return s == null ? "" : s;
    }

    /* ---------- results ---------- */
    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FILE || fileCb == null) return;
        Uri[] result = null;
        if (res == RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null && clip.getItemCount() > 0) {
                result = new Uri[clip.getItemCount()];
                for (int i = 0; i < clip.getItemCount(); i++) result[i] = clip.getItemAt(i).getUri();
            } else if (data.getData() != null) result = new Uri[]{data.getData()};
        }
        fileCb.onReceiveValue(result);
        fileCb = null;
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] grants) {
        super.onRequestPermissionsResult(req, perms, grants);
        boolean ok = grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED;
        if (req == REQ_LOC && geoCb != null) {
            geoCb.invoke(geoOrigin, ok, false);
            geoCb = null;
        }
        notifyWeb("NhariNativeResume");
    }

    void askNotifications() {
        if (android.os.Build.VERSION.SDK_INT >= 33) requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        else openAppSettings();
    }

    void openAppSettings() {
        try { startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); }
        catch (Exception ignored) { }
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.removeJavascriptInterface("NhariAndroid"); web.destroy(); }
        super.onDestroy();
    }

}
