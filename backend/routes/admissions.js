const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('../firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function nowISO() { return new Date().toISOString(); }
function docToObj(doc) { return { id: doc.id, ...doc.data() }; }

// ── GET /api/admissions  (PROTECTED) ──────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db   = getDb();
    const snap = await db.collection('admissions')
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snap.docs.map(docToObj));
  } catch (err) {
    console.error('GET /admissions error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/admissions  (PROTECTED – direct add) ────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      studentName, parentName, phone, altPhone, email,
      classApplied, course, board, city, totalFee,
    } = req.body;

    if (!studentName || !phone || !classApplied || !course) {
      return res.status(400).json({ error: 'studentName, phone, classApplied and course are required.' });
    }

    const db = getDb();
    const year = new Date().getFullYear();
    const countSnap = await db.collection('admissions').count().get();
    const count = (countSnap.data().count || 0) + 1;
    const rollNumber = `TSA-${year}-${String(count).padStart(3, '0')}`;

    const ref = await db.collection('admissions').add({
      studentName  : String(studentName).trim(),
      parentName   : String(parentName  || '').trim(),
      phone        : String(phone).trim(),
      altPhone     : String(altPhone || '').trim(),
      email        : String(email   || '').trim(),
      classApplied : String(classApplied).trim(),
      course       : String(course).trim(),
      board        : String(board  || '').trim(),
      city         : String(city   || '').trim(),
      rollNumber,
      totalFee     : Number(totalFee) || 0,
      admissionDate: nowISO(),
      status       : 'active',
      enquiryId    : null,
      notes        : [],
      createdAt    : nowISO(),
      updatedAt    : nowISO(),
    });

    res.status(201).json({ id: ref.id, rollNumber });
  } catch (err) {
    console.error('POST /admissions error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/admissions/:id  (PROTECTED – update student info) ─
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const allowed = ['studentName','parentName','phone','altPhone','email',
                     'classApplied','course','board','city','totalFee','status'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    update.updatedAt = nowISO();

    await getDb().collection('admissions').doc(req.params.id).update(update);
    res.json({ message: 'Admission updated.' });
  } catch (err) {
    console.error('PUT /admissions/:id error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/admissions/:id  (PROTECTED) ───────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await getDb().collection('admissions').doc(req.params.id).delete();
    res.json({ message: 'Admission deleted.' });
  } catch (err) {
    console.error('DELETE /admissions/:id error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/admissions/:id/notes  (PROTECTED – add note) ─
router.post('/:id/notes', authMiddleware, async (req, res) => {
  try {
    const { text, type, date } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Note text is required.' });
    }

    const validTypes = ['payment', 'reminder', 'general'];
    const noteType   = validTypes.includes(type) ? type : 'general';

    const note = {
      id  : uuidv4(),
      text: String(text).trim(),
      type: noteType,
      date: date || nowISO(),
    };

    const db  = getDb();
    const ref = db.collection('admissions').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Admission not found.' });

    const notes = doc.data().notes || [];
    notes.push(note);

    await ref.update({ notes, updatedAt: nowISO() });
    res.status(201).json({ message: 'Note added.', note });

  } catch (err) {
    console.error('POST /admissions/:id/notes error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/admissions/:id/notes/:noteId  (PROTECTED – edit note) ─
router.put('/:id/notes/:noteId', authMiddleware, async (req, res) => {
  try {
    const { text, type, date } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Note text is required.' });
    }

    const validTypes = ['payment', 'reminder', 'general'];
    const noteType   = validTypes.includes(type) ? type : 'general';

    const db  = getDb();
    const ref = db.collection('admissions').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Admission not found.' });

    const notes = doc.data().notes || [];
    const noteIndex = notes.findIndex(n => n.id === req.params.noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    notes[noteIndex] = {
      ...notes[noteIndex],
      text: String(text).trim(),
      type: noteType,
      date: date || notes[noteIndex].date || nowISO(),
    };

    await ref.update({ notes, updatedAt: nowISO() });
    res.json({ message: 'Note updated.', note: notes[noteIndex] });

  } catch (err) {
    console.error('PUT /admissions/:id/notes/:noteId error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/admissions/:id/notes/:noteId  (PROTECTED) ─
router.delete('/:id/notes/:noteId', authMiddleware, async (req, res) => {
  try {
    const db  = getDb();
    const ref = db.collection('admissions').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Admission not found.' });

    const notes = (doc.data().notes || []).filter(n => n.id !== req.params.noteId);
    await ref.update({ notes, updatedAt: nowISO() });
    res.json({ message: 'Note deleted.' });

  } catch (err) {
    console.error('DELETE /admissions/:id/notes/:noteId error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
