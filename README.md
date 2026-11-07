# CampusFind (Milestone 3 - Core Functionality Development)
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

Cordova Android app. All screens are in www/index.html (HTML/CSS/JS, mock data).

## Features

Register/login with school email (@xu.edu.ph only, password 6+ chars)
Post Lost or Found reports (category, location, date, optional photo)
Found reports can record which authority the item was handed to
Admin approves/rejects every report before it appears in the feed
Browse with search, Lost/Found tabs and category filters
"Possible matches" suggested on each item (same category, shared keywords)
Claim flow: owner describes private details, admin approves/rejects, approved owner sees pickup location
Admin dashboard: reports to review, claims to review, handover (mark as returned), and all records search
"Mine" screen: your reports and claims with status
Status flow

Report: pending -> open -> claim_pending -> returned (or rejected) Claim: pending -> approved / rejected

Admin guide

Log in as admin@xu.edu.ph. The Admin tab appears in the bottom nav.

Known limitations
All data is mock and in memory; it resets on every reload/app restart
Photos are stored as base64 in memory only
Login is simulated (any password works for demo accounts)
Firebase is not connected yet (CSP is already configured for it)
