package com.rayen.nhari;

import android.app.NotificationManager;
import android.app.RemoteInput;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Notification buttons: postpone or skip a recitation; log a prayer, a glucose value or the gym
 * without opening the app (queued in {@link Actions}, applied by the app when it opens).
 */
public class ActionReceiver extends BroadcastReceiver {
    static final String ACT_POSTPONE = "com.rayen.nhari.POSTPONE";
    static final String ACT_SKIP = "com.rayen.nhari.SKIP";
    static final String ACT_LOG = "com.rayen.nhari.LOG";
    static final String KEY_BG = "bg";

    @Override
    public void onReceive(Context c, Intent intent) {
        if (ACT_LOG.equals(intent.getAction())) { log(c, intent); return; }
        String id = intent.getStringExtra("id");
        int nid = intent.getIntExtra("nid", 0);
        if (nid != 0) c.getSystemService(NotificationManager.class).cancel(nid);
        if (id == null) return;
        if (ACT_POSTPONE.equals(intent.getAction())) {
            int min = intent.getIntExtra("min", 30);
            long at = System.currentTimeMillis() + min * 60_000L;
            EventStore.postpone(c, id, at);
            Scheduler.scheduleNext(c);
            Notifs.info(c, "تأجّل", "يبدا على " + new SimpleDateFormat("HH:mm", Locale.US).format(new Date(at)));
        } else if (ACT_SKIP.equals(intent.getAction())) {
            EventStore.skip(c, id);
            Scheduler.scheduleNext(c);
        }
    }

    private static void log(Context c, Intent intent) {
        String tag = intent.getStringExtra("tag");
        JSONObject a;
        try { a = new JSONObject(intent.getStringExtra("act")); } catch (Exception e) { return; }
        String t = a.optString("t");
        boolean test = a.optString("key").startsWith("test-"); // the test buttons in the settings: no side effects
        long now = System.currentTimeMillis();
        JSONObject q = new JSONObject();
        String title, body = "";
        try {
            q.put("t", t).put("key", a.optString("key")).put("dk", a.optString("dk")).put("k", a.optString("k"))
                    .put("ctx", a.optString("ctx", "other")).put("ts", now);
            if ("bg".equals(t)) {
                Bundle r = RemoteInput.getResultsFromIntent(intent);
                CharSequence typed = r == null ? null : r.getCharSequence(KEY_BG);
                String raw = typed == null ? "" : typed.toString().trim().replace(',', '.').replaceAll("[^0-9.]", "");
                String unit = a.optString("unit", "gL");
                double mg = toMg(raw, unit);
                if (!(mg > 10 && mg < 700)) {
                    // not a value: ask again in the same notification
                    JSONObject again = new JSONObject(a.toString()).put("body", "ما فهمتش القيمة — اكتب الرقم كيما يبان في الجهاز (" + unitLabel(unit) + ")");
                    Notifs.act(c, new JSONObject().put("act", again).put("at", now));
                    return;
                }
                q.put("raw", raw).put("mg", Math.round(mg));
                String shown = fmt(mg, unit);
                if (test) title = "🧪 تجربة: " + shown + " — الزر يخدم";
                else {
                    NhariWidget.setBg(c, shown);
                    title = "✅ تسجّل السكر: " + shown;
                    if (mg < 70) hypo(c, a, shown, unit);
                    else if (mg > 250) body = "السكر طالع. حلّ Nhari باش تشوف شنوّة تعمل، وعاود قيس بعد ساعتين.";
                }
            } else if (test) {
                title = "🧪 الزر يخدم ✅";
            } else if ("pray".equals(t)) {
                title = "✅ تقبّل الله — " + a.optString("name", "الصلاة");
            } else {
                title = "✅ يعطيك الصحة — الحصة تسجّلت";
            }
        } catch (JSONException e) { return; }
        Actions.add(c, q);
        Actions.unpost(c, tag);
        Notifs.confirm(c, tag, title, body);
        MainActivity.poke();
    }

    /** Same rule as the app: g/L by default (tolerating "120"), mmol/L ×18, mg/dL as is (tolerating "1.2"). */
    static double toMg(String raw, String unit) {
        double x;
        try { x = Double.parseDouble(raw); } catch (Exception e) { return Double.NaN; }
        if ("mmol".equals(unit)) return x * 18;
        if ("mg".equals(unit)) return x <= 6 ? x * 100 : x;
        return x < 10 ? x * 100 : x;
    }

    static String unitLabel(String unit) {
        return "mmol".equals(unit) ? "mmol/L" : "mg".equals(unit) ? "mg/dL" : "g/L";
    }

    static String fmt(double mg, String unit) {
        if ("mmol".equals(unit)) return String.format(Locale.US, "%.1f mmol/L", mg / 18);
        if ("mg".equals(unit)) return Math.round(mg) + " mg/dL";
        return String.format(Locale.US, "%.2f g/L", mg / 100);
    }

    /** Low value: the 15/15 rule now, and a reminder to measure again in 15 minutes (even if the app stays closed). */
    private static void hypo(Context c, JSONObject a, String shown, String unit) throws JSONException {
        Notifs.alert(c, "hypo", "⚠️ السكر هابط: " + shown,
                "كول 15 غرام سكر سريع: 3 طوابع سكر، ولا 150 ml عصير، ولا 3 تمرات. أقعد وما تسوقش. نفكّرك تعاود تقيس بعد 15 دقيقة.");
        long at = System.currentTimeMillis() + 15 * 60_000L;
        JSONObject act = new JSONObject().put("t", "bg").put("key", "bgh-" + at).put("ctx", "other").put("unit", unit)
                .put("label", a.optString("label", "السكر")).put("ttl", 60 * 60_000L)
                .put("title", "🩸 عاود قيس السكر").put("body", "فاتو 15 دقيقة على الهبوط — اكتب القيمة");
        JSONObject ev = new JSONObject().put("id", "x-hypo-" + at).put("at", at).put("kind", "audio").put("prio", 2).put("stream", "alarm")
                .put("title", "🩸 عاود قيس السكر").put("body", "فاتو 15 دقيقة على الهبوط")
                .put("items", new JSONArray().put(new JSONObject().put("t", "tts").put("text", "عاود قيس السكر. فاتت ربع ساعة على الهبوط.")))
                .put("act", act);
        EventStore.addOne(c, ev);
        Scheduler.scheduleNext(c);
    }
}
