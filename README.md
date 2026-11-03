# CampusFind (Milestone 2 - UI build)
Cordova Android app. All screens are in www/index.html (HTML/CSS/JS, mock data).

## Build and run
npm install -g cordova
cd CampusFind
cordova platform add android
cordova run android          # phone with USB debugging, or an emulator
cordova build android        # APK: platforms/android/app/build/outputs/apk/debug/

## Test in a browser first
cd www && python -m http.server 8000   (open http://localhost:8000)

## Demo accounts (mock data)
student@xu.edu.ph  - student
admin@xu.edu.ph    - admin   (any password, 6+ characters)
