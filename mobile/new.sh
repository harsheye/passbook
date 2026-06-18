#!/bin/bash
# Stop any stuck Gradle daemons
cd android
./gradlew --stop

# Clean and Install the Release version (Offline)
./gradlew clean installRelease

# Start the app on the emulator/device
# Replace com.salt.mobile with your actual package name if different
adb shell am start -n com.salt.mobile/.MainActivity
