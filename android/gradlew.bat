@rem Forward to downloaded Gradle 8.7 distribution
@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
"%USERPROFILE%\.gradle\wrapper\dists\gradle-8.7-bin\gradle-8.7\bin\gradle.bat" %*

