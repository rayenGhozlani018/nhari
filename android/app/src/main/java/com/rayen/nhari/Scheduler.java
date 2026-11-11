package com.rayen.nhari;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONObject;

import java.util.List;

/** One exact alarm at a time: the next planned event. When it rings, the following one is set. */
final class Scheduler {
    static final String ACTION_ALARM = "com.rayen.nhari.ALARM";

    private Scheduler() { }

    static boolean canExact(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
    }

    static void scheduleNext(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(c, AlarmReceiver.class).setAction(ACTION_ALARM);
        PendingIntent pi = PendingIntent.getBroadcast(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        JSONObject next = EventStore.next(c);
        if (next == null) return;
        long at = Math.max(next.optLong("at"), System.currentTimeMillis() + 1000);
        try {
            if (canExact(c)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    /** Called by the alarm: run what is due, then arm the next one. */
    static void onAlarm(Context c) {
        List<JSONObject> due = EventStore.takeDue(c, System.currentTimeMillis() + 30_000);
        scheduleNext(c);
        for (JSONObject e : due) Runner.fire(c, e, false);
        try { NhariWidget.render(c); } catch (Exception ignored) { }
    }
}
