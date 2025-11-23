// frontend/src/pages/DashboardPage.jsx
import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import './dashboard.css';
import { getPlanner, getProgressSummary, getNotifications, getUserMe } from '../api';

// Use your uploaded screenshot (local path)
const HERO_IMAGE = '/mnt/data/Screenshot 2025-11-23 112535.png';

function NextActionCard({ nextTask, onStart }) {
  if (!nextTask) {
    return (
      <div className="dash-card next-action empty">
        <div className="na-left">
          <div className="na-title">No immediate tasks</div>
          <div className="na-sub">You're clear for now — try reviewing a subject or asking the Study Buddy</div>
        </div>
        <div className="na-actions">
          <button className="btn primary" onClick={() => onStart(null)}>Start Focus</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-card next-action">
      <div className="na-left">
        <div className="na-badge" />
        <div>
          <div className="na-title">{nextTask.title}</div>
          <div className="na-sub">{nextTask.subject || 'General'} • {nextTask.durationMin || 30} min</div>
          <div className="na-meta">Due: {nextTask.start ? new Date(nextTask.start).toLocaleDateString() : 'No due date'}</div>
        </div>
      </div>

      <div className="na-actions">
        <button className="btn primary" onClick={() => onStart(nextTask)}>Start Focus</button>
        <button className="btn ghost" onClick={() => window.location.assign('/planner')}>Open Planner</button>
      </div>
    </div>
  );
}

function ProgressRing({ hours, target }) {
  const pct = target > 0 ? Math.min(1, hours / target) : 0;
  const display = Math.round(pct * 100);
  return (
    <div className="progress-ring card">
      <svg viewBox="0 0 36 36" className="ring-svg">
        <path className="ring-bg" d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831" />
        <path
          className="ring-fg"
          strokeDasharray={`${display}, 100`}
          d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831"
        />
        <text x="18" y="20.5" className="ring-text">{display}%</text>
      </svg>
      <div className="ring-caption">
        <div className="caps-title">{hours.toFixed(1)} hrs</div>
        <div className="caps-sub">this week of {target} hrs</div>
      </div>
    </div>
  );
}

function MiniHeatmap({ mastery }) {
  // mastery: { subject: [0..1,...] }
  if (!mastery || Object.keys(mastery).length === 0) return <div className="card small">No mastery data</div>;
  return (
    <div className="card small mastery">
      <div className="heat-title">Mastery — last 7 days</div>
      <div className="heat-grid">
        {Object.entries(mastery).map(([subject, arr]) => (
          <div key={subject} className="heat-row">
            <div className="heat-subject">{subject}</div>
            <div className="heat-cells">
              {arr.slice(0, 7).map((v, i) => (
                <div key={i} className="heat-cell" style={{ background: `rgba(15,157,120,${0.15 + (v || 0) * 0.85})` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications, onOpenPlanner }) {
  return (
    <div className="card notifications">
      <div className="notif-head">
        <div className="notif-title">Notifications</div>
      </div>

      <div className="notif-list">
        {notifications && notifications.length > 0 ? (
          notifications.map((n) => (
            <div key={n._id || n.id} className="notif-row">
              <div className="notif-left">
                <div className="notif-msg">{n.title || n.message}</div>
                <div className="notif-time">{new Date(n.createdAt || Date.now()).toLocaleString()}</div>
              </div>
              <div className="notif-right">
                <button className="link" onClick={() => onOpenPlanner(n)}>Open</button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No notifications</div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data: userData } = useQuery('user.me', getUserMe, { refetchOnWindowFocus: false });
  const { data: plannerData } = useQuery('planner.today', getPlanner, { refetchOnWindowFocus: false });
  const { data: progressData } = useQuery('progress.summary', getProgressSummary, { refetchOnWindowFocus: false });
  const { data: notificationsData } = useQuery(['notifications', 10], () => getNotifications(10), { refetchOnWindowFocus: false });

  const user = userData?.user || userData || { name: 'You', streak: 0, points: 0 };
  const planner = plannerData?.plan || plannerData || { tasks: [] };
  const todayTasks = (planner.tasks || []).slice(0, 5);
  const nextTask = (planner.tasks || []).find(t => t.status !== 'done') || null;

  const progress = progressData?.summary || { hoursThisWeek: 0, targetHours: 8, mastery: {} };
  const notifications = notificationsData?.notifications || notificationsData || [];

  const [focusTask, setFocusTask] = useState(null);

  const handleStartFocus = (task) => {
    setFocusTask(task || nextTask || (planner.tasks && planner.tasks[0]) || null);
  };

  const openPlannerOnNotif = (notif) => {
    // if notif has link / taskId try deep-link; else open planner page
    if (notif?.taskId) {
      window.location.assign(`/planner?task=${notif.taskId}`);
    } else {
      window.location.assign('/planner');
    }
  };

  return (
    <div className="dashboard-root">
      <div className="dash-hero" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="dash-hero-inner">
          <div>
            <div className="hero-title">Good morning, {user.name}</div>
            <div className="hero-sub">Here's your study snapshot for today</div>
          </div>

          <div className="hero-actions">
            <div className="avatar">{(user.name || 'U').charAt(0)}</div>
            <div className="mini-stats">
              <div className="stat"><div className="s-val">{user.streak || 0}</div><div className="s-label">Streak</div></div>
              <div className="stat"><div className="s-val">{user.points || 0}</div><div className="s-label">Points</div></div>
            </div>
            <div>
              <button className="btn primary" onClick={() => handleStartFocus(null)}>Start Study</button>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="col-main">
          <NextActionCard nextTask={nextTask} onStart={handleStartFocus} />

          <div className="dash-row">
            <div className="col-left">
              <div className="card small">
                <div className="card-head"><strong>Today</strong></div>
                <div className="today-list">
                  {todayTasks.length === 0 && <div className="empty">No tasks for today</div>}
                  {todayTasks.map((t) => (
                    <div key={t._id || t.title} className="today-item">
                      <div className={`dot ${t.status === 'done' ? 'done' : ''}`} />
                      <div className="today-body">
                        <div className="today-title">{t.title}</div>
                        <div className="today-meta">{t.durationMin || 30} min • {t.subject || 'General'}</div>
                      </div>
                      <div className="today-actions">
                        <button className="link" onClick={() => setFocusTask(t)}>Focus</button>
                        <button className="link" onClick={() => window.location.assign(`/planner?task=${t._id}`)}>Open</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card small">
                <div className="card-head"><strong>Recent Sessions</strong></div>
                <div className="empty">Session history is on the Planner page — try Focus Mode</div>
              </div>
            </div>

            <div className="col-right">
              <ProgressRing hours={progress.hoursThisWeek || 0} target={progress.targetHours || 8} />
              <MiniHeatmap mastery={progress.mastery || {}} />
            </div>
          </div>
        </div>

        <aside className="col-side">
          <div className="card">
            <div className="card-head"><strong>Quick Actions</strong></div>
            <div className="quick-actions">
              <button className="btn ghost" onClick={() => window.location.assign('/chat')}>Ask Study Buddy</button>
              <button className="btn ghost" onClick={() => window.location.assign('/learn')}>Take Quiz</button>
              <button className="btn ghost" onClick={() => qc.invalidateQueries('planner')}>Regenerate Plan</button>
              <button className="btn ghost" onClick={() => window.location.assign('/planner')}>Open Planner</button>
            </div>
          </div>

          <NotificationsPanel notifications={notifications} onOpenPlanner={openPlannerOnNotif} />

          <div className="card small profile-card">
            <div className="card-head"><strong>Profile</strong></div>
            <div className="profile-body">
              <div className="avatar-lg">{(user.name || 'U').charAt(0)}</div>
              <div className="profile-info">
                <div className="profile-name">{user.name}</div>
                <div className="profile-sub">{user.goals?.join(', ') || 'No goals set'}</div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn ghost" onClick={() => window.location.assign('/auth')}>Edit Profile</button>
                </div>
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* Focus Mode mount spot (use the same FocusMode component you already added) */}
      {focusTask && (
        <div id="focus-mount"></div>
      )}
    </div>
  );
}
