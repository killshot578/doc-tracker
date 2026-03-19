const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection (we'll update later if needed)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB Error:", err));

// Generate tracking ID
function generateTrackingId() {
  return 'DOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Schema
const DocumentSchema = new mongoose.Schema({
  trackingId: { type: String, unique: true },
  title: String,
  origin: String,
  currentLocation: String,
  status: String,
  history: [
    {
      action: String,
      location: String,
      timestamp: String
    }
  ]
});

const Document = mongoose.model('Document', DocumentSchema);

// Create document
app.post('/documents', async (req, res) => {
  const trackingId = generateTrackingId();

  const doc = new Document({
    trackingId,
    title: req.body.title,
    origin: req.body.origin,
    currentLocation: 'HoD Office',
    status: 'Submitted to HoD',
    history: [
      {
        action: 'Submitted',
        location: 'HoD Office',
        timestamp: new Date().toISOString()
      }
    ]
  });

  await doc.save();

  res.json({
    message: 'Document created',
    trackingId
  });
});

// Track document
app.get('/track/:trackingId', async (req, res) => {
  const doc = await Document.findOne({ trackingId: req.params.trackingId });

  if (!doc) return res.status(404).json({ message: 'Not found' });

  res.json(doc);
});

// Update document
app.put('/update/:trackingId', async (req, res) => {
  const { status, location } = req.body;

  const doc = await Document.findOne({ trackingId: req.params.trackingId });

  if (!doc) return res.status(404).json({ message: 'Not found' });

  doc.status = status;
  doc.currentLocation = location;

  doc.history.push({
    action: status,
    location,
    timestamp: new Date().toISOString()
  });

  await doc.save();

  res.json({ message: 'Updated successfully' });
});

// Start server
const PORT = process.env.PORT || 5000;
console.log("Starting server...");
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});