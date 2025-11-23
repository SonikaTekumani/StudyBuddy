require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const User = require('./models/User');
const StudyPlan = require('./models/StudyPlan');
const StudySession = require('./models/StudySession');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ---------------------------
// MongoDB Connection
// ---------------------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Mongo connected'))
  .catch((err) => console.error(err));

// ---------------------------
// Mock Auth Middleware
// (Replace with JWT later)
// ---------------------------
app.use(async (req, res, next) => {
  let userId = req.header('x-user-id');

  if (!userId) {
    let user = await User.findOne({ email: 'demo@planner.local' });
    if (!user) {
      user = await User.create({
        name: 'Demo User',
        email: 'demo@planner.local'
      });
    }
    req.user = user;
  } else {
    const user = await User.findById(userId);
    req.user = user;
  }

  next();
});

// ---------------------------
// GET /planner
// Retrieve user’s plan
// ---------------------------
app.get('/planner', async (req, res) => {
  try {
    const userId = req.user._id;

    let plan = await StudyPlan.findOne({ userId }).sort({ updatedAt: -1 });

    if (!plan) {
      plan = await StudyPlan.create({
        userId,
        title: 'My Plan',
        tasks: []
      });
    }

    res.json({ ok: true, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------
// POST /planner/generate
// Simple Demo Plan Generator
// ---------------------------
// ---------------------------
// POST /planner/generate   <-- ADD THIS BLOCK
// Simple Demo Plan Generator
// ---------------------------
app.post('/planner/generate', async (req, res) => {
  try {
    const userId = req.user._id;
    const { goals, availability, subjects } = req.body;

    // Build tasks from provided goals
    const tasks = (goals || []).map((g, i) => ({
      title: g.title || `Task ${i + 1}`,
      description: g.description || '',
      subject: g.subject || (subjects && subjects[0]) || 'General',
      durationMin: g.durationMin || 30,
      start: null,
      end: null,
      priority: g.priority || 3
    }));

    const plan = await StudyPlan.create({
      userId,
      title: 'Generated Plan',
      tasks,
      snapshotAt: new Date()
    });

    res.json({ ok: true, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// ---------------------------
// POST /planner/:planId/task
// Add a single task atomically (server assigns ObjectId)
// ---------------------------
app.post('/planner/:planId/task', async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user._id;
    const { task } = req.body; // expects a task object WITHOUT _id

    if (!task || typeof task !== 'object') {
      return res.status(400).json({ ok: false, error: 'invalid_task_payload' });
    }

    const plan = await StudyPlan.findOne({ _id: planId, userId });
    if (!plan) {
      return res.status(404).json({ ok: false, error: 'plan_not_found' });
    }

    // Create a Mongoose subdocument so an _id is generated
    plan.tasks.unshift(task); // add at beginning (you can push instead)
    await plan.save();

    res.json({ ok: true, plan });
  } catch (err) {
    console.error('ADD TASK ERROR', err);
    res.status(500).json({ ok: false, error: err.message || 'server_error' });
  }
});


// ---------------------------
// Dashboard API routes
// Paste this into backend/server.js (after the planner routes)
// ---------------------------

app.get('/user/me', async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ ok: false, error: 'user_not_found' });

    const streak = user.streak || 0;
    const points = user.points || 0;
    res.json({
      ok: true,
      user: {
        name: user.name,
        email: user.email,
        streak,
        points,
        goals: user.goals || [],
        weeklyTargetHours: user.weeklyTargetHours || 8
      }
    });
  } catch (err) {
    console.error('GET /user/me error', err);
    res.status(500).json({ ok: false, error: err.message || 'server_error' });
  }
});

app.get('/planner/today', async (req, res) => {
  try {
    const userId = req.user._id;
    const plan = await StudyPlan.findOne({ userId }).sort({ updatedAt: -1 }).lean();
    if (!plan) return res.json({ ok: true, plan: { tasks: [] }});

    const now = new Date();
    const todayStr = now.toDateString();
    // include tasks scheduled for today OR tasks without schedule but not done (common UX)
    const todayTasks = (plan.tasks || []).filter((t) => {
      if (t.status === 'done') return false;
      if (t.start) {
        try {
          return new Date(t.start).toDateString() === todayStr;
        } catch (e) { /* ignore */ }
      }
      // include unscheduled tasks as possible today candidates
      return !t.start && !t.end;
    });

    res.json({
      ok: true,
      plan: {
        _id: plan._id,
        title: plan.title,
        tasks: todayTasks
      }
    });
  } catch (err) {
    console.error('GET /planner/today error', err);
    res.status(500).json({ ok: false, error: err.message || 'server_error' });
  }
});

app.get('/progress/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // start of week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = (day + 6) % 7; // convert Sunday(0) -> 6 so Monday is start
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0,0,0,0);

    const sessions = await StudySession.find({ userId, startedAt: { $gte: startOfWeek } }).lean();
    let seconds = 0;
    sessions.forEach(s => {
      const start = new Date(s.startedAt);
      const stop = s.stoppedAt ? new Date(s.stoppedAt) : new Date();
      seconds += Math.max(0, (stop - start) / 1000);
    });
    const hoursThisWeek = +(seconds / 3600).toFixed(2);
    const targetHours = (req.user && req.user.weeklyTargetHours) || 8;

    // Build a simple per-subject last-7-days time summary (best-effort)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0,0,0,0);

    const recentSessions = await StudySession.find({ userId, startedAt: { $gte: sevenDaysAgo } }).lean();
    const mastery = {}; // { subject: [v0..v6] } normalized 0..1 per cell
    recentSessions.forEach(s => {
      const subj = s.subject || s.subjectName || 'General';
      const dayIndex = Math.min(6, Math.max(0, Math.floor((new Date(s.startedAt) - sevenDaysAgo) / (1000*60*60*24))));
      const durationHours = (s.stoppedAt ? (new Date(s.stoppedAt) - new Date(s.startedAt)) : (Date.now() - new Date(s.startedAt))) / 3600000;
      if (!mastery[subj]) mastery[subj] = new Array(7).fill(0);
      mastery[subj][dayIndex] += durationHours;
    });

    // Normalize: cap at 2 hours per day -> 0..1
    Object.keys(mastery).forEach(sub => {
      mastery[sub] = mastery[sub].map(v => Math.min(1, v / 2));
    });

    res.json({ ok: true, summary: { hoursThisWeek, targetHours, mastery } });
  } catch (err) {
    console.error('GET /progress/summary error', err);
    res.status(500).json({ ok: false, error: err.message || 'server_error' });
  }
});

app.get('/notifications', async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));

    let notifications = [];
    if (typeof Notification !== 'undefined') {
      notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    } else {
      // fallback friendly samples when Notification model is missing
      notifications = [
        { _id: 'n-1', title: 'Reminder: Practice Math today', message: '2 tasks due', createdAt: new Date() },
        { _id: 'n-2', title: 'Nice work!', message: 'You completed a focus session', createdAt: new Date(Date.now() - 3600*1000) }
      ];
    }

    res.json({ ok: true, notifications });
  } catch (err) {
    console.error('GET /notifications error', err);
    res.status(500).json({ ok: false, error: err.message || 'server_error' });
  }
});

// ---------------------------
// PUT /planner/:planId
// Update entire tasks array
// ---------------------------
app.put('/planner/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const update = req.body;

    const plan = await StudyPlan.findByIdAndUpdate(planId, update, {
      new: true
    });

    res.json({ ok: true, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------
// PUT /planner/calendar/move
// Move a task to new timeslot
// ---------------------------
app.put('/planner/calendar/move', async (req, res) => {
  try {
    const userId = req.user._id;
    const { planId, taskId, newStartISO, newEndISO } = req.body;

    const plan = await StudyPlan.findOne({ _id: planId, userId });
    if (!plan) {
      return res.status(404).json({ ok: false, error: 'plan_not_found' });
    }

    const task = plan.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'task_not_found' });
    }

    task.start = new Date(newStartISO);
    task.end = new Date(newEndISO);

    await plan.save();

    res.json({ ok: true, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------
// POST /session/start
// Start study session
// ---------------------------
app.post('/session/start', async (req, res) => {
  try {
    const userId = req.user._id;
    const { planId, taskId } = req.body;

    const session = await StudySession.create({
      userId,
      planId,
      taskId,
      startedAt: new Date()
    });

    res.json({ ok: true, session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------
// POST /session/stop
// Stop session
// ---------------------------
app.post('/session/stop', async (req, res) => {
  try {
    const { sessionId, notes, mood } = req.body;

    const session = await StudySession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'session_not_found' });
    }

    session.stoppedAt = new Date();
    session.notes = notes;
    session.mood = mood;

    await session.save();

    res.json({ ok: true, session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------
// POST /session/log
// Quick-log a completed session
// ---------------------------
app.post('/session/log', async (req, res) => {
  try {
    const { userId, planId, taskId, notes } = req.body;

    const log = await StudySession.create({
      userId,
      planId,
      taskId,
      notes,
      startedAt: new Date(),
      stoppedAt: new Date()
    });

    res.json({ ok: true, log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});


// ---------------------------
// Start Express Server
// ---------------------------
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});

// debug: list routes (temporary — paste this before app.listen)
console.log('Registered routes:');
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    const methods = Object.keys(r.route.methods).join(',').toUpperCase();
    console.log(methods, r.route.path);
  }
});
