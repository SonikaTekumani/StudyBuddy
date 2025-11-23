// frontend/src/components/FocusMode.jsx
// Full Focus Mode (Option C)
// Usage:
// <FocusMode
//    task={task}                    // task object { _id, title, ... }
//    plannerId={planner._id}        // current plan id
//    onClose={() => setFocusOpen(false)}
//    onSessionEnd={(session) => qc.invalidateQueries('planner')}
// />
//
// Depends: react, react-query, your existing api functions (startSession, stopSession, updatePlan)
// Save as frontend/src/components/FocusMode.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { startSession, stopSession, updatePlan } from '../api';

// Use your uploaded screenshot path (will be transformed to a URL by the environment)
const HERO_IMAGE = 'https://i.pinimg.com/1200x/9f/53/1b/9f531b5b37e29371a4fc99c01871d6c8.jpg';

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function FocusMode({ task, plannerId, onClose, onSessionEnd }) {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0); // count-up seconds
  const [notes, setNotes] = useState('');
  const [sessionObj, setSessionObj] = useState(null);
  const [markDone, setMarkDone] = useState(false);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const startMutation = useMutation((payload) => startSession(payload));
  const stopMutation = useMutation((payload) => stopSession(payload));
  const updatePlanMutation = useMutation(({ planId, payload }) => updatePlan(planId, payload));

  useEffect(() => {
    // prepare a simple beep for end (WebAudio fallback)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioRef.current = () => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        setTimeout(() => {
          try { o.stop(); } catch (e) {}
        }, 700);
      };
    } catch (e) {
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // keyboard shortcuts
    const handler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!running) handleStart();
        else handleTogglePause();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleStop();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused, seconds, sessionObj]);

  const tick = () => {
    setSeconds((s) => s + 1);
  };

  const handleStart = async () => {
    if (running) return;
    try {
      // call backend to create session
      const payload = { planId: plannerId, taskId: task._id };
      const res = await startMutation.mutateAsync(payload);
      setSessionObj(res.session || res);
      setRunning(true);
      setPaused(false);
      setSeconds(0);
      timerRef.current = setInterval(tick, 1000);

      // optimistic: mark task as in-progress (local UI + persist)
      try {
        const updatedTasks = (await fetchCurrentTasksAndPatch(task._id, 'in-progress')) || null;
        if (updatedTasks) {
          // persist
          await updatePlanMutation.mutateAsync({ planId: plannerId, payload: { tasks: updatedTasks } });
        }
      } catch (e) {
        // ignore non-fatal
        console.warn('Could not mark in-progress', e);
      }
    } catch (err) {
      console.error('start session failed', err);
      alert('Failed to start focus session. See console.');
    }
  };

  const handleTogglePause = () => {
    if (!running) return;
    if (paused) {
      // resume
      timerRef.current = setInterval(tick, 1000);
      setPaused(false);
    } else {
      // pause
      clearInterval(timerRef.current);
      timerRef.current = null;
      setPaused(true);
    }
  };

  const handleStop = async () => {
    if (!running && !sessionObj) {
      onClose?.();
      return;
    }

    // stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // call backend to stop session (include notes and mood based on markDone)
    try {
      const payload = {
        sessionId: sessionObj?._id || sessionObj?.id,
        notes: notes || '',
        mood: markDone ? 'accomplished' : 'neutral'
      };
      const res = await stopMutation.mutateAsync(payload);
      // play a sound if available
      if (audioRef.current) {
        try { audioRef.current(); } catch (e) {}
      }

      // optionally update task status to done
      if (markDone) {
        try {
          const updatedTasks = (await fetchCurrentTasksAndPatch(task._id, 'done')) || null;
          if (updatedTasks) {
            await updatePlanMutation.mutateAsync({ planId: plannerId, payload: { tasks: updatedTasks } });
          }
        } catch (e) {
          console.warn('Could not mark done', e);
        }
      }

      setRunning(false);
      setPaused(false);
      setSessionObj(res.session || res);
      onSessionEnd?.(res.session || res);
      alert('Session stopped — nice work!');

    } catch (err) {
      console.error('stop session failed', err);
      alert('Failed to stop session. See console.');
    } finally {
      onClose?.();
    }
  };

  // Helper: fetch current planner tasks from server (GET /planner) and patch a task status
  // We avoid importing getPlanner here to keep this component self-contained; we'll use fetch to the API base.
  const fetchCurrentTasksAndPatch = async (taskIdToUpdate, newStatus) => {
    try {
      const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${base}/planner`);
      if (!res.ok) return null;
      const body = await res.json();
      const plan = body.plan;
      if (!plan) return null;
      const tasks = (plan.tasks || []).map((t) => (t._id === taskIdToUpdate ? { ...t, status: newStatus } : t));
      // return full tasks array in same shape as plan.tasks for updatePlan usage
      return tasks;
    } catch (err) {
      console.error('fetchCurrentTasksAndPatch error', err);
      return null;
    }
  };

  // Progress ring values
  const totalSeconds = seconds;
  const minutes = Math.floor(totalSeconds / 60);
  const secondsOnly = totalSeconds % 60;

  // SVG progress ring (simple)
  const ringSize = 140;
  const stroke = 8;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressPct = Math.min(1, Math.min(3600, totalSeconds) / 3600); // cap at 1 hour for animation
  const dashoffset = circumference * (1 - progressPct);

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={leftStyle}>
          <img src={HERO_IMAGE} alt="hero" style={heroStyle} />
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{task?.title || 'Focus Session'}</div>
            <div style={{ color: '#6b6b6b', marginTop: 6 }}>{task?.subject || 'General'} • {task?.durationMin || 30} min</div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div>
              <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                <defs />
                <g transform={`translate(${ringSize/2}, ${ringSize/2})`}>
                  <circle r={radius} fill="transparent" stroke="#f1f1f1" strokeWidth={stroke} />
                  <circle
                    r={radius}
                    fill="transparent"
                    stroke="#0f9d78"
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90)"
                  />
                </g>
              </svg>
              <div style={{ textAlign: 'center', marginTop: 8, fontWeight: 600, fontSize: 18 }}>
                {formatTime(totalSeconds)}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {!running && (
                  <button style={primaryButton} onClick={handleStart}>Start</button>
                )}

                {running && (
                  <>
                    <button style={secondaryButton} onClick={handleTogglePause}>{paused ? 'Resume' : 'Pause'}</button>
                    <button style={dangerButton} onClick={handleStop}>Stop</button>
                  </>
                )}

                {!running && (
                  <button style={ghostButton} onClick={() => { onClose?.(); }}>Close</button>
                )}
              </div>

              <div style={{ marginTop: 10, color: '#555', fontSize: 13 }}>
                Shortcuts: <strong>Space</strong> = Start/Pause/Resume, <strong>Esc</strong> = Stop & Close
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Notes (saved with session)</label>
                <textarea
                  placeholder="Quick notes: what you worked on, blockers, key takeaways..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', minHeight: 90, padding: 10, borderRadius: 8, border: '1px solid #eee', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
                  Mark task as done when stopping
                </label>
              </div>
            </div>
          </div>
        </div>

        <div style={rightStyle}>
          <div style={{ fontSize: 14, color: '#333', fontWeight: 700, marginBottom: 12 }}>Session summary</div>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 10 }}>Time tracked</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>{formatTime(totalSeconds)}</div>

          <div style={{ marginTop: 18 }}>
            <div style={{ color: '#666', fontSize: 13 }}>Actions</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button style={ghostButton} onClick={() => { setNotes(''); }}>Clear Notes</button>
              <button style={ghostButton} onClick={() => { setSeconds(0); }}>Reset Timer</button>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ color: '#666', fontSize: 13 }}>Task quick info</div>
            <div style={{ marginTop: 8, background: '#fbfbfb', padding: 10, borderRadius: 8 }}>
              <div style={{ fontWeight: 600 }}>{task?.title}</div>
              <div style={{ color: '#777', fontSize: 13, marginTop: 6 }}>{task?.description || 'No description'}</div>
            </div>
          </div>

          <div style={{ marginTop: 18, color: '#999', fontSize: 12 }}>
            Tip: Use the timer to build momentum — focus for 25–50 minutes, then take a break.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Inline styles (kept here so component is self-contained) */
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(10,10,10,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
  padding: 18
};

const cardStyle = {
  width: '92%',
  maxWidth: 1100,
  background: '#fff',
  borderRadius: 12,
  display: 'flex',
  gap: 18,
  padding: 18,
  boxShadow: '0 14px 40px rgba(8,8,8,0.18)'
};

const leftStyle = { flex: 1, display: 'flex', flexDirection: 'column' };
const rightStyle = { width: 320, paddingLeft: 8, display: 'flex', flexDirection: 'column' };

const heroStyle = { width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' };

const primaryButton = { background: '#0f9d78', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 };
const secondaryButton = { background: '#f3f4f6', color: '#111', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' };
const dangerButton = { background: '#ef4444', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' };
const ghostButton = { background: 'transparent', color: '#333', border: '1px solid #eee', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' };
