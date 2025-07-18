const { DateTime } = require("luxon");

console.log("Testing Luxon:");
const now = DateTime.now().setZone("America/New_York");
console.log("Current EDT:", now.toFormat("hh:mm a ZZZZ"));
