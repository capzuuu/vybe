package app.vybe.stream;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    private static final Set<String> TRUSTED_EXTERNAL_HOSTS = new HashSet<>(Arrays.asList(
        "github.com",
        "www.github.com",
        "themoviedb.org",
        "www.themoviedb.org",
        "youtube.com",
        "www.youtube.com",
        "youtu.be"
    ));

    private View customView;
    private FrameLayout customViewContainer;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private int previousOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
    private boolean systemBarsWereVisible = true;
    private OnBackPressedCallback customViewBackCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        customViewBackCallback = new OnBackPressedCallback(false) {
            @Override
            public void handleOnBackPressed() {
                hideCustomView();
            }
        };
        getOnBackPressedDispatcher().addCallback(this, customViewBackCallback);

        Bridge activeBridge = getBridge();
        if (activeBridge != null && activeBridge.getWebView() != null) {
            WebView webView = activeBridge.getWebView();
            hardenWebViewSettings(webView);

            // Prevent ad-network redirects/hijacks while preserving localhost SPA + iframe playback
            activeBridge.setWebViewClient(new BridgeWebViewClient(activeBridge) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri url = request.getUrl();
                    if (url == null) {
                        return true;
                    }

                    String scheme = url.getScheme() != null ? url.getScheme().toLowerCase(Locale.US) : "";
                    if ("data".equals(scheme) || "blob".equals(scheme) || "about".equals(scheme)) {
                        return false;
                    }

                    if ("app.vybe.stream".equals(scheme)) {
                        return super.shouldOverrideUrlLoading(view, request);
                    }

                    if (isSafeAppOrigin(url)) {
                        return false;
                    }

                    // Keep embedded player subframes (e.g. VidLink / YouTube) contained inside their iframe;
                    // block any external-app / intent:// / cleartext escapes from ads inside iframes.
                    if (!request.isForMainFrame()) {
                        return !"https".equals(scheme);
                    }

                    // Top-level navigation: open only trusted HTTPS links externally; block all ad hijacks.
                    if (isTrustedExternalHttps(url)) {
                        return super.shouldOverrideUrlLoading(view, request);
                    }
                    return true;
                }
            });

            webView.setWebChromeClient(new BridgeWebChromeClient(activeBridge) {
                @Override
                public Bitmap getDefaultVideoPoster() {
                    return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
                }

                @Override
                public boolean onCreateWindow(
                    WebView view,
                    boolean isDialog,
                    boolean isUserGesture,
                    Message resultMsg
                ) {
                    // Reject script-initiated popups/popunders; allow only verified trusted user-tapped links
                    if (!isUserGesture) {
                        return false;
                    }
                    WebView.HitTestResult hit = view.getHitTestResult();
                    if (
                        hit != null &&
                        (hit.getType() == WebView.HitTestResult.SRC_ANCHOR_TYPE ||
                            hit.getType() == WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE) &&
                        hit.getExtra() != null
                    ) {
                        Uri target = Uri.parse(hit.getExtra());
                        if (isTrustedExternalHttps(target)) {
                            try {
                                startActivity(new Intent(Intent.ACTION_VIEW, target));
                            } catch (ActivityNotFoundException ignored) {
                            }
                        }
                    }
                    return false;
                }

                @Override
                public void onShowCustomView(View view, CustomViewCallback callback) {
                    if (customView != null) {
                        callback.onCustomViewHidden();
                        return;
                    }

                    FrameLayout decorView = (FrameLayout) getWindow().getDecorView();
                    WindowInsetsCompat rootInsets = ViewCompat.getRootWindowInsets(decorView);
                    systemBarsWereVisible =
                        rootInsets == null || rootInsets.isVisible(WindowInsetsCompat.Type.systemBars());
                    previousOrientation = getRequestedOrientation();

                    FrameLayout container = new FrameLayout(MainActivity.this);
                    container.setBackgroundColor(Color.BLACK);
                    container.setKeepScreenOn(true);
                    container.setClickable(true);
                    container.addView(
                        view,
                        new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    );

                    decorView.addView(
                        container,
                        new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    );

                    customView = view;
                    customViewContainer = container;
                    customViewCallback = callback;
                    customViewBackCallback.setEnabled(true);

                    setFullscreenSystemUi(true);
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                }

                @Override
                public void onHideCustomView() {
                    hideCustomView();
                }
            });
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && customView != null) {
            setFullscreenSystemUi(true);
        }
    }

    private void hideCustomView() {
        if (customView == null) {
            return;
        }

        View viewToRemove = customViewContainer != null ? customViewContainer : customView;
        ViewGroup decorView = (ViewGroup) getWindow().getDecorView();
        decorView.removeView(viewToRemove);

        customView = null;
        customViewContainer = null;

        WebChromeClient.CustomViewCallback callback = customViewCallback;
        customViewCallback = null;

        if (customViewBackCallback != null) {
            customViewBackCallback.setEnabled(false);
        }

        if (callback != null) {
            callback.onCustomViewHidden();
        }

        if (systemBarsWereVisible) {
            setFullscreenSystemUi(false);
        }
        setRequestedOrientation(previousOrientation);
    }

    private void setFullscreenSystemUi(boolean fullscreen) {
        Window window = getWindow();
        View decorView = window.getDecorView();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        if (controller == null) {
            return;
        }
        if (fullscreen) {
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            controller.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars());
        }
    }

    @SuppressWarnings("deprecation")
    private void hardenWebViewSettings(WebView webView) {
        WebSettings settings = webView.getSettings();
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setGeolocationEnabled(false);
        settings.setSaveFormData(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setOffscreenPreRaster(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }
    }

    private boolean isSafeAppOrigin(Uri uri) {
        if (uri == null) {
            return false;
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || host == null) {
            return false;
        }
        return ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) &&
            ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equalsIgnoreCase(host));
    }

    private boolean isTrustedExternalHttps(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) {
            return false;
        }
        String host = uri.getHost();
        return host != null && TRUSTED_EXTERNAL_HOSTS.contains(host.toLowerCase(Locale.US));
    }
}
