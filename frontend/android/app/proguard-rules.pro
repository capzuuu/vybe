# Preserve attributes needed by Capacitor reflection & WebView JS bridge
-keepattributes JavascriptInterface,*Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep app entry point and WebChromeClient customizations
-keep public class app.vybe.stream.MainActivity { *; }
-keepclassmembers class app.vybe.stream.** {
    public <methods>;
    protected <methods>;
}

# Keep WebView @JavascriptInterface callbacks
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor core, built-in plugins, and official plugins instantiated from capacitor.plugins.json
-keep public class com.getcapacitor.plugin.** { *; }
-keep public class com.capacitorjs.plugins.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    <init>();
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
}

# Strip verbose and debug log calls in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}
