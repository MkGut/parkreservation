const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { DateTime } = require("luxon");
// const twilio = require("twilio"); // Uncomment when Twilio is ready

admin.initializeApp();
const db = admin.firestore();

const ADMIN_OVERRIDE_CODE = "91210";

// Willis Park reference location
const REF_LAT = 34.077107;
const REF_LNG = -84.295352;
const MILES_RADIUS = 0.5;

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function distanceInMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

exports.reserveCourtV1 = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { name, phone, court, startTime, duration, adminCode, lat, lng } = req.body;
    const isAdmin = adminCode === ADMIN_OVERRIDE_CODE;

    if (!/^WL\d{1,2}$|^WB\d{1,2}$/i.test(court)) {
      return res.status(400).send("Invalid court code. Use format WL1–WL10 or WB1–WB10.");
    }

    if (!isAdmin) {
      if (lat == null || lng == null) {
        return res.status(400).send("Location data is required.");
      }
      const dist = distanceInMiles(lat, lng, REF_LAT, REF_LNG);
      if (dist > MILES_RADIUS) {
        return res.status(403).send("You are not within 0.5 miles of Willis Park.");
      }
    }

    try {
      const [hh, mm] = startTime.split(":" ).map(Number);
      const nowET = DateTime.now().setZone("America/New_York");
      const start = DateTime.fromObject(
        {
          year: nowET.year,
          month: nowET.month,
          day: nowET.day,
          hour: hh,
          minute: mm,
        },
        { zone: "America/New_York" }
      );
      const end = start.plus({ minutes: duration });

      await db.collection("reservations").add({
        name,
        phone,
        court,
        startTime,
        duration,
        status: "confirmed",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        startTimestamp: admin.firestore.Timestamp.fromDate(start.toJSDate()),
        endTimestamp: admin.firestore.Timestamp.fromDate(end.toJSDate()),
      });

      res.status(200).send("Reservation confirmed.");
    } catch (err) {
      console.error("Error creating reservation:", err);
      res.status(500).send("Error creating reservation.");
    }
  });
});

exports.getReservations = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    console.log("🔍 getReservations function triggered");

    try {
      const now = admin.firestore.Timestamp.now();
      console.log("📅 Firestore 'now' timestamp:", now.toDate());

      const query = db.collection("reservations")
        .where("status", "==", "confirmed")
        .where("endTimestamp", ">", now)
        .orderBy("endTimestamp", "asc");

      const snapshot = await query.get();
      console.log(`📊 Query snapshot size: ${snapshot.size}`);

      const reservations = snapshot.docs.map(doc => {
        const data = doc.data();
        const startET = DateTime.fromJSDate(data.startTimestamp.toDate()).setZone("America/New_York");
        const endET = DateTime.fromJSDate(data.endTimestamp.toDate()).setZone("America/New_York");
        return {
          court: data.court,
          startTime: data.startTime,
          duration: data.duration,
          startTimestamp: data.startTimestamp.toDate(),
          endTimestamp: data.endTimestamp.toDate(),
          startTimeET: startET.toISO(),
          endTimeET: endET.toISO()
        };
      });

      res.status(200).json(reservations);
    } catch (err) {
      console.error("❌ Failed to fetch reservations:", err);
      res.status(500).send("Failed to fetch reservations.");
    }
  });
});
