// backend/server-dashboard-routes.js
// Paste this into backend/server.js (after your planner routes)

const express = require('express');
// models: User, StudyPlan, StudySession, QuizResult, Notification must be required in server.js already
// If you use different names, adapt below.

app.get('/user/me', async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    // compute small metrics: streak, points, goals
    // If you store streak/points in user doc use them; else compute approximate
    const streak = user.streak || 0;
    const points = user.points || 0;
    res.json({ ok: true, user: { name: user.name, email: user.email, streak, points, goals: user.goals || [] } });
  } catch (err) {
    console.error('GET /user/me error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/planner/today', async (req, res) => {
  try {
    const userId = req.user._id;
    const plan = await StudyPlan.findOne({ userId }).sort({ updatedAt: -1 }).lean();
    if (!plan) return res.json({ ok: true, plan: { tasks: [] }});
    // return only today's tasks + next task
    const now = new Date();
    const todayTasks = (plan.tasks || []).filter(t => {
      if (!t.start && !t.end) return false; // only tasks with schedule considered today
      const start = t.start ? new Date(t.start) : null;
      const end = t.end ? new Date(t.end) : null;
      if (!start && !end) return false;
      return (start && start.toDateString() === now.toDateString()) || (end && end.toDateString() === now.toDateString());
    });
    res.json({ ok: true, plan: { _id: plan._id, title: plan.title, tasks: todayTasks } });
  } catch (err) {
    console.error('GET /planner/today error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/progress/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    // Compute hours this week from StudySession
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // sunday start
    startOfWeek.setHours(0,0,0,0);

    const sessions = await StudySession.find({ userId, startedAt: { $gte: startOfWeek } }).lean();
    let seconds = 0;
    sessions.forEach(s => {
      const start = new Date(s.startedAt);
      const stop = s.stoppedAt ? new Date(s.stoppedAt) : new Date();
      seconds += Math.max(0, (stop - start) / 1000);
    });
    const hoursThisWeek = +(seconds / 3600).toFixed(2);
    const targetHours = (req.user?.weeklyTargetHours) || 8;

    // small mastery: compute simple last-7-day per-subject time (mock)
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(now.getDate() - 6);
    const recentSessions = await StudySession.find({ userId, startedAt: { $gte: sevenDaysAgo } }).lean();
    const mastery = {}; // {subject: [0..1 per day]}
    recentSessions.forEach(s => {
      // if you store subject in session, use it; else lookup task for subject
      let subject = s.subject;
      if (!subject && s.taskId) {
        const planDoc = null; // skip; to keep small we will not query; this will be enhanced if needed
      }
      const dayIndex = Math.floor((new Date(s.startedAt) - sevenDaysAgo) / (1000*60*60*24));
      if (!mastery[subject]) mastery[subject] = new Array(7).fill(0);
      mastery[subject][Math.min(6, Math.max(0, dayIndex))] += ((new Date(s.stoppedAt || new Date()) - new Date(s.startedAt)) / 3600000);
    });
    // normalize to 0..1 per cell (cap at 2 hrs per day)
    Object.keys(mastery).forEach(sub => mastery[sub] = mastery[sub].map(v => Math.min(1, v/2)));

    res.json({ ok: true, summary: { hoursThisWeek, targetHours, mastery } });
  } catch (err) {
    console.error('GET /progress/summary error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/notifications', async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit || '10', 10);
    // if you have Notification model:
    let notifications = [];
    if (typeof Notification !== 'undefined') {
      notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    } else {
      // fallback: create some friendly sample notifications
      notifications = [
        { _id: 'n1', title: 'Reminder: Math practice today', createdAt: new Date() },
        { _id: 'n2', title: 'You completed a 25m session', createdAt: new Date(Date.now() - 3600*1000) }
      ];
    }
    res.json({ ok: true, notifications });
  } catch (err) {
    console.error('GET /notifications error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
