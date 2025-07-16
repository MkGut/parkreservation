// server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔥 Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ✅ Welcome route
app.get('/', (req, res) => {
  res.send('🎾 Welcome to the Willis Park Court Reservation System!');
});

// 🧪 Firestore test route
app.get('/test-firebase', async (req, res) => {
  try {
    const result = await db.collection('reservations').add({
      courtId: 'court1',
      name: 'Mike',
      startTime: new Date(),
    });
    res.send(`✅ Reservation created with ID: ${result.id}`);
  } catch (err) {
    console.error('❌ Firestore error:', err);
    res.status(500).send('Error writing to Firestore');
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
