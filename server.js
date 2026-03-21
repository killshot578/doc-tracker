const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB Error:", err));

// Generate Tracking ID
function generateTrackingId() {
  return 'DOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WORKFLOW FLOW
const workflow = [
  "HoD Office",
  "Principal Office",
  "Trust Office",
  "Accounts Office"
];

// Schema
const DocumentSchema = new mongoose.Schema({
  trackingId: { type: String, unique: true },
  title: String,
  origin: String,
  category: String,
  currentLocation: String,
  status: String,
  createdAt: { type: Date, default: Date.now },

  history: [
    {
      action: String,
      location: String,
      timestamp: String
    }
  ]
});

const Document = mongoose.model('Document', DocumentSchema);

// CREATE DOCUMENT
app.post('/documents', async (req, res) => {
  const trackingId = generateTrackingId();

  const doc = new Document({
    trackingId,
    title: req.body.title,
    origin: req.body.origin,
    category: req.body.category,
    currentLocation: "HoD Office",
    status: "Submitted",
    createdAt: new Date(),
    history: [
      {
        action: "Submitted",
        location: "HoD Office",
        timestamp: new Date().toISOString()
      }
    ]
  });

  await doc.save();

  res.json({
    message: "Document created",
    trackingId
  });
});

// TRACK DOCUMENT
app.get('/track/:trackingId', async (req, res) => {
  const doc = await Document.findOne({ trackingId: req.params.trackingId });

  if (!doc) return res.status(404).json({ message: "Not found" });

  res.json(doc);
});

// AUTO NEXT STEP (MAIN FEATURE)
app.put('/next/:trackingId', async (req, res) => {
  const doc = await Document.findOne({ trackingId: req.params.trackingId });

  if (!doc) return res.status(404).json({ message: "Not found" });

  const currentIndex = workflow.indexOf(doc.currentLocation);

  if (currentIndex < workflow.length - 1) {
    doc.currentLocation = workflow[currentIndex + 1];
    doc.status = "Forwarded";
  } else {
    doc.status = "Completed";
  }

  doc.history.push({
    action: doc.status,
    location: doc.currentLocation,
    timestamp: new Date().toISOString()
  });

  await doc.save();

  res.json({ message: "Moved to next step", doc });
});

// OPTIONAL MANUAL UPDATE (still kept)
app.put('/update/:trackingId', async (req, res) => {
  const { status, location } = req.body;

  const doc = await Document.findOne({ trackingId: req.params.trackingId });

  if (!doc) return res.status(404).json({ message: "Not found" });

  doc.status = status;
  doc.currentLocation = location;

  doc.history.push({
    action: status,
    location,
    timestamp: new Date().toISOString()
  });

  await doc.save();

  res.json({ message: "Updated successfully" });
});

// GET ALL DOCUMENTS (for dashboard)
app.get('/documents', async (req, res) => {
  const docs = await Document.find().sort({ createdAt: -1 });
  res.json(docs);
});

// START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});