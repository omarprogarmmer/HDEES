package com.hadeeth.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 41;
    private static final String APP_ASSET_HOST = "appassets.androidplatform.net";
    private static final String APP_ASSET_ORIGIN = "https://" + APP_ASSET_HOST;
    private static final String TAG = "HadeethApp";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ReminderReceiver.createNotificationChannel(this);

        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AndroidNotificationsBridge(), "AndroidNotifications");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                WebView view,
                WebResourceRequest request
            ) {
                Uri uri = request.getUrl();
                if (!isAppAssetUri(uri)) {
                    return super.shouldInterceptRequest(view, request);
                }
                return openAppAsset(uri);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isAppAssetUri(uri)) return false;
                return openExternalLink(uri.toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if (isAppAssetUri(uri)) return false;
                return openExternalLink(url);
            }
        });

        setContentView(webView);
        webView.loadUrl(APP_ASSET_ORIGIN + "/web/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        ReminderScheduler.scheduleSavedReminders(this);
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript(
                "window.dispatchEvent(new Event('native-notification-permission-change'))",
                null
            ));
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private boolean isAppAssetUri(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) &&
            APP_ASSET_HOST.equalsIgnoreCase(uri.getHost()) &&
            uri.getPort() == -1 &&
            uri.getUserInfo() == null;
    }

    private boolean openExternalLink(String value) {
        Uri uri = Uri.parse(value);
        String scheme = uri.getScheme();
        if (!"mailto".equalsIgnoreCase(scheme) &&
            !"https".equalsIgnoreCase(scheme) &&
            !"http".equalsIgnoreCase(scheme)) {
            return true;
        }

        try {
            Intent intent = "mailto".equalsIgnoreCase(scheme)
                ? new Intent(Intent.ACTION_SENDTO, uri)
                : new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (android.content.ActivityNotFoundException error) {
            if (webView != null) {
                webView.evaluateJavascript(
                    "alert('لا يوجد تطبيق مناسب لفتح هذا الرابط.')",
                    null
                );
            }
        }
        return true;
    }

    private WebResourceResponse openAppAsset(Uri uri) {
        String path = Uri.decode(uri.getPath());
        if (path == null || !path.startsWith("/web/") || path.contains("..")) {
            return notFoundResponse();
        }

        String assetPath = path.substring(1);
        String extension = MimeTypeMap.getFileExtensionFromUrl(assetPath);
        String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        if (mimeType == null) mimeType = "application/octet-stream";

        try {
            InputStream stream = getAssets().open(assetPath);
            String encoding = mimeType.startsWith("text/") ||
                mimeType.contains("javascript") ||
                mimeType.contains("json") ? "UTF-8" : null;
            return new WebResourceResponse(mimeType, encoding, stream);
        } catch (FileNotFoundException error) {
            return notFoundResponse();
        } catch (IOException error) {
            Log.e(TAG, "Could not load bundled app asset: " + assetPath, error);
            return notFoundResponse();
        }
    }

    private WebResourceResponse notFoundResponse() {
        return new WebResourceResponse(
            "text/plain",
            "UTF-8",
            404,
            "Not Found",
            Collections.emptyMap(),
            null
        );
    }

    private void requestNotificationPermissions() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                NOTIFICATION_PERMISSION_REQUEST
            );
            return;
        }
        requestExactAlarmAccess();
    }

    private void requestExactAlarmAccess() {
        if (Build.VERSION.SDK_INT < 31) return;
        AlarmManager alarmManager = getSystemService(AlarmManager.class);
        if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
            Intent intent = new Intent(
                Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + getPackageName())
            );
            startActivity(intent);
        }
    }

    private String notificationStatus() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return "notification_permission";
        }
        if (Build.VERSION.SDK_INT >= 31) {
            AlarmManager alarmManager = getSystemService(AlarmManager.class);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                return "exact_alarm_permission";
            }
        }
        return "granted";
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        String[] permissions,
        int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST &&
            grantResults.length > 0 &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            requestExactAlarmAccess();
        }
        ReminderScheduler.scheduleSavedReminders(this);
        if (webView != null) {
            webView.evaluateJavascript(
                "window.dispatchEvent(new Event('native-notification-permission-change'))",
                null
            );
        }
    }

    private final class AndroidNotificationsBridge {
        @JavascriptInterface
        public String saveReminders(String json) {
            return ReminderScheduler.saveReminders(MainActivity.this, json) ? "saved" : "error";
        }

        @JavascriptInterface
        public String getNotificationStatus() {
            return notificationStatus();
        }

        @JavascriptInterface
        public void requestNotificationPermissions() {
            runOnUiThread(MainActivity.this::requestNotificationPermissions);
        }
    }
}
