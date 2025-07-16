Willis Park Court Reservation System

This project provides a backend service for reserving tennis or pickleball courts at Willis Park using Firebase Cloud Functions and Firestore. It supports basic location-based access control, admin override, and optional Twilio integration for SMS notifications.

Project Structure

willis-reservation/
├── functions/              # Firebase backend (Cloud Functions)
│   └── index.js
│   └── package.json
├── index.html              # Frontend (optional)
├── firebase.json           # Firebase deploy configuration
├── .firebaserc             # Firebase project config
├── .gitignore              # Ignored files and secrets

Prerequisites

Node.js (v20 or compatible with Firebase 1st Gen)

Firebase CLI (npm install -g firebase-tools)

A Firebase project (created via the Firebase Console)

(Optional) A Twilio account for SMS features

Setup Instructions

1. Configure Firebase Admin Key

In the Firebase Console, create a new service account and download the JSON key.

Convert the JSON key to base64:

On PowerShell:

[Convert]::ToBase64String([IO.File]::ReadAllBytes("firebase-key.json")) > key.txt

Open key.txt and copy the entire base64 string.

Set it in Firebase functions config:

firebase functions:config:set service.key="PASTE_YOUR_BASE64_STRING_HERE"

2. (Optional) Configure Twilio

If you plan to use SMS notifications:

firebase functions:config:set twilio.sid="your_sid" twilio.token="your_token" twilio.number="+15555555555"

3. Install Dependencies

From the functions/ directory:

cd functions
npm install

4. Deploy Functions

From the project root:

firebase deploy --only functions

Available Cloud Functions

reserveCourtV1

Handles court reservation requests.

Requires name, phone, court, startTime, duration, lat, lng

If the adminCode matches the override, location checks are bypassed

Saves reservation to Firestore with server timestamp and computed UTC timestamps

getReservations

Returns a list of current and upcoming confirmed reservations.

Filters out expired reservations

Returns court, startTime, duration, startTimestamp, and endTimestamp

Important Notes

The Firebase key should never be committed to GitHub. Use .gitignore to protect it.

Admin override code is hardcoded in index.js as 91210.

Location validation ensures non-admin users are within 0.5 miles of Willis Park.

Local Testing

You can use Postman or similar tools to send test HTTP requests to the functions, or run the Firebase Emulator Suite for full local testing.

License

MIT License. Use at your own risk.
