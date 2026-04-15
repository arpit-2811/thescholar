const express        = require('express');
const { getDb }      = require('../firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Helper ────────────────────────────────────────────────
function nowISO() { return new Date().toISOString(); }

function docToObj(doc) {
  return { id: doc.id, ...doc.data() };
}

// ── POST /api/enquiries  (PUBLIC – website form submission) ─
router.post('/', async (req, res) => {
  try {
    const {
      studentName, parentName, phone, altPhone, email,
      classApplied, course, board, city, source, message,
    } = req.body;

    if (!studentName || !phone || !classApplied || !course) {
      return res.status(400).json({ error: 'studentName, phone, classApplied and course are required.' });
    }

    const db  = getDb();
    const ref = await db.collection('enquiries').add({
      studentName : String(studentName).trim(),
      parentName  : String(parentName  || '').trim(),
      phone       : String(phone).trim(),
      altPhone    : String(altPhone || '').trim(),
      email       : String(email   || '').trim(),
      classApplied: String(classApplied).trim(),
      course      : String(course).trim(),
      board       : String(board  || '').trim(),
      city        : String(city   || '').trim(),
      source      : String(source || '').trim(),
      message     : String(message || '').trim(),
      status      : 'new',
      source_type : 'website',
      createdAt   : nowISO(),
      updatedAt   : nowISO(),
    });

    res.status(201).json({ id: ref.id, message: 'Enquiry received. Thank you!' });

  } catch (err) {
    console.error('POST /enquiries error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/enquiries  (PROTECTED) ───────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db   = getDb();
    const snap = await db.collection('enquiries')
      .orderBy('createdAt', 'desc')
      .get();

    const enquiries = snap.docs.map(docToObj);

    // Optional server-side search (query param ?search=xyz)
    const q = (req.query.search || '').toLowerCase();
    const filtered = q
      ? enquiries.filter(e =>
          (e.studentName || '').toLowerCase().includes(q) ||
          (e.phone       || '').includes(q) ||
          (e.parentName  || '').toLowerCase().includes(q)
        )
      : enquiries;

    res.json(filtered);

  } catch (err) {
    console.error('GET /enquiries error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/enquiries/manual  (PROTECTED – admin manually adds) ─
router.post('/manual', authMiddleware, async (req, res) => {
  try {
    const {
      studentName, parentName, phone, altPhone, email,
      classApplied, course, board, city, source, message,
    } = req.body;

    if (!studentName || !phone || !classApplied || !course) {
      return res.status(400).json({ error: 'studentName, phone, classApplied and course are required.' });
    }

    const db  = getDb();
    const ref = await db.collection('enquiries').add({
      studentName : String(studentName).trim(),
      parentName  : String(parentName  || '').trim(),
      phone       : String(phone).trim(),
      altPhone    : String(altPhone || '').trim(),
      email       : String(email   || '').trim(),
      classApplied: String(classApplied).trim(),
      course      : String(course).trim(),
      board       : String(board  || '').trim(),
      city        : String(city   || '').trim(),
      source      : String(source || '').trim(),
      message     : String(message || '').trim(),
      status      : 'new',
      source_type : 'manual',
      createdAt   : nowISO(),
      updatedAt   : nowISO(),
    });

    res.status(201).json({ id: ref.id, message: 'Enquiry added.' });

  } catch (err) {
    console.error('POST /enquiries/manual error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/enquiries/:id  (PROTECTED – update status) ───
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['status', 'message'];
    const update  = {};

    allowed.forEach(k => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    update.updatedAt = nowISO();

    await getDb().collection('enquiries').doc(id).update(update);
    res.json({ message: 'Enquiry updated.' });

  } catch (err) {
    console.error('PUT /enquiries/:id error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/enquiries/:id  (PROTECTED) ────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await getDb().collection('enquiries').doc(req.params.id).delete();
    res.json({ message: 'Enquiry deleted.' });
  } catch (err) {
    console.error('DELETE /enquiries/:id error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/enquiries/:id/convert  (PROTECTED) ─────────
router.post('/:id/convert', authMiddleware, async (req, res) => {
  try {
    const db  = getDb();
    const doc = await db.collection('enquiries').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }

    const enq = doc.data();

    if (enq.status === 'converted') {
      return res.status(400).json({ error: 'Already converted to admission.' });
    }

    // Generate roll number: TSA-YYYY-NNN
    const year = new Date().getFullYear();
    const countSnap = await db.collection('admissions').count().get();
    const count = (countSnap.data().count || 0) + 1;
    const rollNumber = `TSA-${year}-${String(count).padStart(3, '0')}`;

    // Create admission document
    const admRef = await db.collection('admissions').add({
      studentName  : enq.studentName,
      parentName   : enq.parentName  || '',
      phone        : enq.phone,
      altPhone     : enq.altPhone    || '',
      email        : enq.email       || '',
      classApplied : enq.classApplied,
      course       : enq.course,
      board        : enq.board       || '',
      city         : enq.city        || '',
      rollNumber,
      totalFee     : 0,
      admissionDate: nowISO(),
      status       : 'active',
      enquiryId    : doc.id,
      notes        : [],
      createdAt    : nowISO(),
      updatedAt    : nowISO(),
    });

    // Mark enquiry as converted
    await db.collection('enquiries').doc(req.params.id).update({
      status   : 'converted',
      updatedAt: nowISO(),
    });

    res.status(201).json({
      message     : 'Enquiry converted to admission.',
      admissionId : admRef.id,
      rollNumber,
    });

  } catch (err) {
    console.error('POST /enquiries/:id/convert error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
