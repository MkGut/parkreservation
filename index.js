const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { DateTime } = require("luxon");

admin.initializeApp();
const db = admin.firestore();
const ADMIN_OVERRIDE_CODE = "91210";

const PARK_LOCATIONS = {
  "North Park":       { lat: 34.1090153,       lng: -84.2845130 },
  "Wills Park":       { lat: 34.077107,        lng: -84.295352  },
  "Webb Bridge Park": { lat: 34.06720068656765, lng: -84.21848767523515 }
};
const MILES_RADIUS = 0.5;

function toRad(deg) { return deg * Math.PI / 180; }
function distance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.reserveCourtV1 = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { name, phone, court, startTime, duration, adminCode, lat, lng } = req.body;
      if (!court || typeof court !== "string") return res.status(400).send("Court selection is required.");
      const [parkName] = court.split(" – ");
      const park = PARK_LOCATIONS[parkName];
      if (!park) return res.status(400).send(`Invalid park: ${parkName}`);
      const isAdmin = adminCode === ADMIN_OVERRIDE_CODE;
      if (!isAdmin) {
        const userLat = Number(lat);
        const userLng = Number(lng);
        if (isNaN(userLat) || isNaN(userLng)) return res.status(400).send("Valid location data is required.");
        if (distance(userLat, userLng, park.lat, park.lng) > MILES_RADIUS)
          return res.status(403).send(`You must be within ${MILES_RADIUS} miles of ${parkName}.`);
      }
      const [hh, mm] = String(startTime).split(":").map(Number);
      const nowET = DateTime.now().setZone("America/New_York");
      const start = DateTime.fromObject({ year: nowET.year, month: nowET.month, day: nowET.day, hour: hh, minute: mm }, { zone: "America/New_York" });
      const end = start.plus({ minutes: Number(duration) });
      await db.collection("reservations").add({
        name,
        phone: phone || null,
        court,
        startTime,
        duration: Number(duration),
        status: "confirmed",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        startTimestamp: admin.firestore.Timestamp.fromDate(start.toJSDate()),
        endTimestamp: admin.firestore.Timestamp.fromDate(end.toJSDate())
      });
      res.status(200).send("Reservation confirmed.");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error processing reservation.");
    }
  });
});

exports.getReservations = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const now = admin.firestore.Timestamp.now();
      const snapshot = await db.collection("reservations")
        .where("status", "==", "confirmed")
        .where("endTimestamp", ">", now)
        .orderBy("endTimestamp", "asc")
        .get();
      const results = snapshot.docs.map(doc => {
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
      res.status(200).json(results);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching reservations.");
    }
  });
});
