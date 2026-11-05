package com.hadeeth.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.regex.Pattern;

final class ReminderScheduler {
    private static final String TAG = "HadeethReminders";
    private static final String PREFS = "local_reminders";
    private static final String REMINDERS_KEY = "reminders_json";
    private static final Pattern TIME_PATTERN = Pattern.compile(
        "^(?:[01]\\d|2[0-3]):[0-5]\\d$"
    );

    private ReminderScheduler() {}

    static boolean saveReminders(Context context, String json) {
        try {
            JSONArray incoming = new JSONArray(json);
            JSONArray safeReminders = new JSONArray();
            for (int index = 0; index < incoming.length(); index++) {
                JSONObject reminder = incoming.optJSONObject(index);
                if (reminder == null) continue;

                String id = reminder.optString("id", "");
                String time = reminder.optString("time", "");
                String message = reminder.optString("message", "").trim();
                if (id.isEmpty() || id.length() > 100 || !TIME_PATTERN.matcher(time).matches()) {
                    continue;
                }

                JSONObject safeReminder = new JSONObject();
                safeReminder.put("id", id);
                safeReminder.put("time", time);
                safeReminder.put("message", message.length() > 200 ? message.substring(0, 200) : message);
                safeReminders.put(safeReminder);
            }

            JSONArray previous = getSavedReminders(context);
            for (int index = 0; index < previous.length(); index++) {
                JSONObject reminder = previous.optJSONObject(index);
                if (reminder != null) {
                    String id = reminder.optString("id", "");
                    if (!id.isEmpty()) cancel(context, id);
                }
            }

            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(REMINDERS_KEY, safeReminders.toString())
                .apply();
            scheduleAll(context, safeReminders);
            return true;
        } catch (JSONException error) {
            Log.e(TAG, "Invalid reminder data", error);
            return false;
        }
    }

    static JSONArray getSavedReminders(Context context) {
        String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(REMINDERS_KEY, "[]");
        try {
            return new JSONArray(json);
        } catch (JSONException error) {
            Log.e(TAG, "Could not read saved reminders", error);
            return new JSONArray();
        }
    }

    static void scheduleSavedReminders(Context context) {
        scheduleAll(context, getSavedReminders(context));
    }

    static void scheduleAll(Context context, JSONArray reminders) {
        for (int index = 0; index < reminders.length(); index++) {
            JSONObject reminder = reminders.optJSONObject(index);
            if (reminder == null) continue;
            String id = reminder.optString("id", "");
            if (!id.isEmpty()) cancel(context, id);
        }

        for (int index = 0; index < reminders.length(); index++) {
            JSONObject reminder = reminders.optJSONObject(index);
            if (reminder == null) continue;

            String id = reminder.optString("id", "");
            String time = reminder.optString("time", "");
            String message = reminder.optString("message", "").trim();
            if (id.isEmpty() || message.isEmpty() ||
                !TIME_PATTERN.matcher(time).matches()) {
                continue;
            }
            schedule(context, id, time);
        }
    }

    static JSONObject findReminder(Context context, String id) {
        JSONArray reminders = getSavedReminders(context);
        for (int index = 0; index < reminders.length(); index++) {
            JSONObject reminder = reminders.optJSONObject(index);
            if (reminder != null && id.equals(reminder.optString("id"))) {
                return reminder;
            }
        }
        return null;
    }

    static void scheduleNext(Context context, String id, String time) {
        if (!TIME_PATTERN.matcher(time).matches()) return;
        schedule(context, id, time);
    }

    private static void schedule(Context context, String id, String time) {
        String[] parts = time.split(":");
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
        next.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) {
            next.add(Calendar.DAY_OF_YEAR, 1);
        }

        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager unavailable; reminder was not scheduled.");
            return;
        }
        PendingIntent pendingIntent = reminderPendingIntent(context, id);
        try {
            if (Build.VERSION.SDK_INT >= 31 && !alarmManager.canScheduleExactAlarms()) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    next.getTimeInMillis(),
                    pendingIntent
                );
            } else {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    next.getTimeInMillis(),
                    pendingIntent
                );
            }
        } catch (SecurityException error) {
            Log.e(TAG, "Exact alarm permission is unavailable.", error);
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                next.getTimeInMillis(),
                pendingIntent
            );
        }
    }

    private static void cancel(Context context, String id) {
        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        if (alarmManager != null) {
            alarmManager.cancel(reminderPendingIntent(context, id));
        }
    }

    private static PendingIntent reminderPendingIntent(Context context, String id) {
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.setData(Uri.parse("hadeeth://reminder/" + Uri.encode(id)));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, 0, intent, flags);
    }
}
