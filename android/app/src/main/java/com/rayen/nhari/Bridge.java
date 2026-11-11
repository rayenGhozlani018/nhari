package com.rayen.nhari;

import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

/** What the web app can ask the phone: plan the reminders, test a sound, open the right settings. */
final class Bridge {
    private final MainActivity act;

    Bridge(MainActivity act) { this.act = act; }

    @JavascriptInterface
    public String info() {
        JSONObject o = new JSONObject();
        try {
            NotificationManager nm = act.getSystemService(NotificationManager.class);
            PowerManager pm = act.getSystemService(PowerManager.class);
            o.put("version", BuildConfig.VERSION_NAME);
            o.put("sdk", Build.VERSION.SDK_INT);
            o.put("notif", nm.areNotificationsEnabled());
            o.put("exact", Scheduler.canExact(act));
            o.put("battery", pm != null && pm.isIgnoringBatteryOptimizations(act.getPackageName()));
            o.put("sound", Notifs.soundAllowed(act));
            o.put("count", EventStore.events(act).length());
            o.put("tts", Voice.status == null ? "checking" : Voice.status);
            JSONObject n = EventStore.next(act);
            if (n != null) o.put("next", new JSONObject().put("at", n.optLong("at")).put("title", n.optString("title")));
        } catch (Exception ignored) { }
        return o.toString();
    }

    /** {events: [...]} — the whole plan for the coming days. */
    @JavascriptInterface
    public void schedule(String json) {
        try {
            JSONObject o = new JSONObject(json);
            EventStore.replace(act, o.optJSONArray("events"));
            Scheduler.scheduleNext(act);
        } catch (Exception ignored) { }
    }

    /** Play an event now (test buttons), whatever the ringer mode. */
    @JavascriptInterface
    public void test(String eventJson) {
        try { Runner.fire(act, new JSONObject(eventJson), true); }
        catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void stop() {
        try { act.startService(new Intent(act, PlayerService.class).setAction(PlayerService.ACT_STOP)); }
        catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void askNotifications() { act.runOnUiThread(act::askNotifications); }

    @JavascriptInterface
    public void openExactAlarms() {
        act.runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= 31) act.startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + act.getPackageName())));
                else act.openAppSettings();
            } catch (Exception e) { act.openAppSettings(); }
        });
    }

    @JavascriptInterface
    public void openBattery() {
        act.runOnUiThread(() -> {
            try { act.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + act.getPackageName()))); }
            catch (Exception e) { act.openAppSettings(); }
        });
    }

    @JavascriptInterface
    public void openAppSettings() { act.runOnUiThread(act::openAppSettings); }

    /** Install the Arabic voice: the engine's own "install voice data" screen, else the system TTS settings. */
    @JavascriptInterface
    public void installVoice() {
        act.runOnUiThread(() -> {
            Voice.status = null;
            try {
                Intent i = new Intent(android.speech.tts.TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                if (Voice.hasGoogle(act)) i.setPackage(Voice.GOOGLE);
                act.startActivity(i);
            } catch (Exception e) {
                try { act.startActivity(new Intent("com.android.settings.TTS_SETTINGS")); }
                catch (Exception e2) { act.openAppSettings(); }
            }
        });
    }

    @JavascriptInterface
    public void recheckVoice() { act.runOnUiThread(() -> Voice.check(act)); }

    @JavascriptInterface
    public void openUrl(String url) { act.runOnUiThread(() -> act.openExternal(Uri.parse(url))); }

    @JavascriptInterface
    public String takeShared() { return act.takeShared(); }

    @JavascriptInterface
    public String version() { return BuildConfig.VERSION_NAME; }
}
