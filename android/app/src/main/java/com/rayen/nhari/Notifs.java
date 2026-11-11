package com.rayen.nhari;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;

import org.json.JSONObject;

/** Notification channels and builders (framework only, no support library). */
final class Notifs {
    static final String CH_PLAY = "nhari_play";
    static final String CH_ALERT = "nhari_alert";
    static final String CH_QUIET = "nhari_quiet";
    static final int ID_PLAYING = 4242;

    private Notifs() { }

    static void channels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        NotificationChannel play = new NotificationChannel(CH_PLAY, "تشغيل الصوت (أذان، أذكار، قرآن)", NotificationManager.IMPORTANCE_LOW);
        play.setSound(null, null);
        play.setShowBadge(false);
        NotificationChannel alert = new NotificationChannel(CH_ALERT, "تنبيهات Nhari", NotificationManager.IMPORTANCE_HIGH);
        alert.enableVibration(true);
        NotificationChannel quiet = new NotificationChannel(CH_QUIET, "تنبيهات بلا صوت (قراية، صامت)", NotificationManager.IMPORTANCE_DEFAULT);
        quiet.setSound(null, null);
        quiet.enableVibration(true);
        nm.createNotificationChannel(play);
        nm.createNotificationChannel(alert);
        nm.createNotificationChannel(quiet);
    }

    static int idFor(String id) { return (id == null ? 0 : id.hashCode()) & 0x0fffffff; }

    /** Sound only when the phone rings normally and "do not disturb" is off. */
    static boolean soundAllowed(Context c) {
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        if (am != null && am.getRingerMode() != AudioManager.RINGER_MODE_NORMAL) return false;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        return nm == null || nm.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_ALL
                || nm.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_UNKNOWN;
    }

    static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 7, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static Notification.Builder base(Context c, String channel, String title, String body) {
        channels(c);
        Notification.Builder b = new Notification.Builder(c, channel)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentIntent(openApp(c))
                .setColor(0xFF2F5BE7);
        if (body != null && !body.isEmpty()) {
            b.setContentText(body);
            b.setStyle(new Notification.BigTextStyle().bigText(body));
        }
        return b;
    }

    /** A plain reminder. With "listen", an audio event that could not play shows a button to play it. */
    static void simple(Context c, JSONObject e, boolean quiet, boolean listen) {
        String id = e.optString("id", "n" + System.currentTimeMillis());
        Notification.Builder b = base(c, quiet ? CH_QUIET : CH_ALERT, e.optString("title", "Nhari"), e.optString("body", ""))
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER);
        if (listen) {
            Intent play = new Intent(c, PlayerService.class).setAction(PlayerService.ACT_PLAY).putExtra("event", e.toString());
            PendingIntent pi = PendingIntent.getForegroundService(c, ("listen" + id).hashCode(), play, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            b.addAction(new Notification.Action.Builder(null, "▶ اسمع", pi).build());
        }
        c.getSystemService(NotificationManager.class).notify(idFor(id), b.build());
    }

    static void info(Context c, String title, String body) {
        Notification.Builder b = base(c, CH_QUIET, title, body).setAutoCancel(true).setTimeoutAfter(60_000);
        c.getSystemService(NotificationManager.class).notify(idFor("info"), b.build());
    }

    /** "In 5 minutes I start..." with: start now / postpone / not today. */
    static void warn(Context c, JSONObject e) {
        String target = e.optString("target");
        int nid = idFor(target);
        Notification.Builder b = base(c, CH_ALERT, e.optString("title"), e.optString("body"))
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setTimeoutAfter(Math.max(60_000, e.optLong("ttl", 10 * 60_000)));

        Intent start = new Intent(c, PlayerService.class).setAction(PlayerService.ACT_PLAY_ID).putExtra("id", target).putExtra("nid", nid);
        b.addAction(new Notification.Action.Builder(null, "ابدا توا",
                PendingIntent.getForegroundService(c, ("start" + target).hashCode(), start, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());

        int later = e.optInt("postponeMin", 30);
        Intent post = new Intent(c, ActionReceiver.class).setAction(ActionReceiver.ACT_POSTPONE).putExtra("id", target).putExtra("min", later).putExtra("nid", nid);
        b.addAction(new Notification.Action.Builder(null, "أجّل " + later + " د",
                PendingIntent.getBroadcast(c, ("post" + target).hashCode(), post, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());

        Intent skip = new Intent(c, ActionReceiver.class).setAction(ActionReceiver.ACT_SKIP).putExtra("id", target).putExtra("nid", nid);
        b.addAction(new Notification.Action.Builder(null, "مش اليوم",
                PendingIntent.getBroadcast(c, ("skip" + target).hashCode(), skip, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());

        c.getSystemService(NotificationManager.class).notify(nid, b.build());
    }

    /** The notification shown while something plays, with a Stop button. */
    static Notification playing(Context c, String title, String text) {
        Intent stop = new Intent(c, PlayerService.class).setAction(PlayerService.ACT_STOP);
        PendingIntent ps = PendingIntent.getService(c, 99, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = base(c, CH_PLAY, title, text)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_TRANSPORT)
                .addAction(new Notification.Action.Builder(null, "⏹ وقّف", ps).build());
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }
}
