package com.hadeeth.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import org.json.JSONObject;

public final class ReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "HadeethReminders";
    private static final String CHANNEL_ID = "daily_reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        String id = data == null ? "" : Uri.decode(data.getLastPathSegment());
        JSONObject reminder = ReminderScheduler.findReminder(context, id);
        if (reminder == null) return;

        String message = reminder.optString("message", "").trim();
        String time = reminder.optString("time", "");
        if (message.isEmpty()) return;

        createNotificationChannel(context);
        if (Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Reminder fired but notification permission is not granted.");
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            Log.e(TAG, "NotificationManager unavailable.");
            return;
        }

        Intent openApp = new Intent(context, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            id.hashCode(),
            openApp,
            pendingFlags
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, CHANNEL_ID)
            : new Notification.Builder(context);
        Notification notification = builder
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("تذكير من تطبيق حديث")
            .setContentText(message)
            .setStyle(new Notification.BigTextStyle().bigText(message))
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build();
        manager.notify(id.hashCode(), notification);

        ReminderScheduler.scheduleNext(context, id, time);
    }

    static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "التذكيرات اليومية",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("تذكيرات محلية مجدولة من تطبيق حديث");
        manager.createNotificationChannel(channel);
    }
}
