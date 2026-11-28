-keep class com.carevaplus.jarvis.service.** { *; }
-dontwarn org.json.**

# Tink (via security-crypto) references optional annotation classes
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.json.**
# brain module is reflection-free but keep model classes readable in stack traces
-keep class com.carevaplus.jarvis.brain.** { *; }
