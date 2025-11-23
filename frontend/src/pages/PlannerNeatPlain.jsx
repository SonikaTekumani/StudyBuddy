// frontend/src/pages/PlannerNeatPlain.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getPlanner, generatePlanner, updatePlan, startSession } from '../api';
import './planner-neat.css';
import FocusMode from '../components/FocusMode';

// hero image file you uploaded (will be transformed to a URL by the environment)
const HERO_IMAGE = 'https://i.pinimg.com/736x/f3/87/c0/f387c01af1045290530dc779dcb64c3d.jpg';

export default function PlannerNeatPlain() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useQuery('planner', getPlanner, { refetchOnWindowFocus: false });

  const generateMutation = useMutation((payload) => generatePlanner(payload), {
    onSuccess: (res) => qc.setQueryData('planner', res)
  });

  const updateMutation = useMutation(({ planId, payload }) => updatePlan(planId, payload), {
    onSuccess: () => qc.invalidateQueries('planner')
  });

  const startMutation = useMutation(({ planId, taskId }) => startSession({ planId, taskId }), {
    onSuccess: () => qc.invalidateQueries('planner')
  });

  const planner = data?.plan || { tasks: [], title: 'My Plan' };
  const tasks = planner.tasks || [];

  // UI state
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [localTasks, setLocalTasks] = useState(tasks);
  // NEW: focusTask to open FocusMode modal
  const [focusTask, setFocusTask] = useState(null);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (editingTask) setEditTitle(editingTask.title || '');
  }, [editingTask]);

  // ---------- Helper: optimistic update wrapper ----------
  const optimisticUpdateTasks = async (updatedTasks) => {
    const prev = qc.getQueryData('planner');
    // optimistic UI
    qc.setQueryData('planner', (old) => {
      if (!old) return old;
      return { ...old, plan: { ...old.plan, tasks: updatedTasks } };
    });

    try {
      await updateMutation.mutateAsync({ planId: planner._id, payload: { ...planner, tasks: updatedTasks } });
      // success, query invalidated by mutation config
    } catch (err) {
      console.error('Persist tasks failed', err);
      // rollback: re-fetch authoritative state
      qc.invalidateQueries('planner');
      throw err;
    }
  };

  // ---------- Inline field handlers ----------
  const handleChangeDue = async (taskId, newDate) => {
    try {
      const updatedTasks = localTasks.map((t) => (t._id === taskId ? { ...t, start: newDate || null } : t));
      setLocalTasks(updatedTasks);
      await optimisticUpdateTasks(updatedTasks);
    } catch (err) {
      alert('Failed to update due date. See console.');
    }
  };

  const handleChangePriority = async (taskId, newPriority) => {
    try {
      const updatedTasks = localTasks.map((t) => (t._id === taskId ? { ...t, priority: Number(newPriority) } : t));
      setLocalTasks(updatedTasks);
      await optimisticUpdateTasks(updatedTasks);
    } catch (err) {
      alert('Failed to update priority. See console.');
    }
  };

  const handleChangeStatus = async (taskId, newStatus) => {
    try {
      const updatedTasks = localTasks.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t));
      setLocalTasks(updatedTasks);
      await optimisticUpdateTasks(updatedTasks);
    } catch (err) {
      alert('Failed to update status. See console.');
    }
  };

  // Existing handlers (generate / quick add / start focus / edit)
  const handleQuickAdd = async () => {
    try {
      if (!planner || !planner._id) {
        alert('No planner found. Reload the page.');
        return;
      }
      const newTask = {
        title: 'New quick task',
        description: '',
        durationMin: 30,
        subject: 'General',
        priority: 3,
        status: 'todo'
      };

      // optimistic: append locally
      const optimistic = [newTask, ...(localTasks || [])];
      setLocalTasks(optimistic);
      await updateMutation.mutateAsync({ planId: planner._id, payload: { ...planner, tasks: optimistic } });
      qc.invalidateQueries('planner');
    } catch (err) {
      console.error('Quick Add failed', err);
      qc.invalidateQueries('planner');
      alert('Quick Add failed. See console.');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        goals: [
          { title: 'Revise calculus', durationMin: 45, priority: 4 },
          { title: 'Practice coding', durationMin: 60, priority: 3 }
        ]
      };
      const res = await generateMutation.mutateAsync(payload);
      // set result - generateMutation onSuccess already sets cache, but ensure localTasks too
      if (res?.plan) setLocalTasks(res.plan.tasks || []);
      alert('Plan generated successfully.');
    } catch (err) {
      console.error('generate error', err);
      alert('Generate failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
    } finally {
      setIsGenerating(false);
    }
  };

  // NOTE: keep startMutation if you still want to directly start session via API.
  // But now Start Focus from UI opens FocusMode modal instead of immediately calling API.
  const handleStartFocus = async (task) => {
    // open Focus Mode modal for the chosen task
    setFocusTask(task);
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    const updatedTask = { ...editingTask, title: editTitle };
    const updatedTasks = localTasks.map((t) => (t._id === updatedTask._id ? updatedTask : t));
    try {
      await optimisticUpdateTasks(updatedTasks);
      setEditingTask(null);
    } catch (err) {
      // optimisticUpdateTasks already handled rollback & alert
    }
  };

  if (isLoading) return <div className="pn-loading">Loading planner...</div>;

  return (
    <div className="pn-root fade-in">
      <header className="pn-hero">
        <div className="pn-hero-inner">
          <div className="pn-badge">📚</div>
          <div className="pn-hero-text">
            <h1 className="pn-title">STAY FOCUSED</h1>
            <p className="pn-sub">Exam Cram Dashboard — quick schedule, progress and study sessions</p>
          </div>
          <img src={HERO_IMAGE} alt="preview" className="pn-hero-img" />
        </div>
      </header>

      <main className="pn-main">
        <section className="pn-center">
          <div className="pn-card">
            <div className="pn-card-head">
              <div>
                <h2>Study Schedule</h2>
                <div className="pn-subtle">Organize tasks — edit due, priority, and status inline</div>
              </div>

              <div className="pn-actions-top">
                <button className="pn-btn pn-btn-ghost" onClick={() => qc.invalidateQueries('planner')}>
                  {isFetching ? 'Refreshing…' : 'Refresh'}
                </button>

                <button
                  className="pn-btn pn-btn-primary"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating…' : 'Generate Plan'}
                </button>
              </div>
            </div>

            <div className="pn-table-wrap">
              <table className="pn-table">
                <thead>
                  <tr>
                    <th className="col-task">Task</th>
                    <th className="col-sub">Subject</th>
                    <th className="col-date">Due</th>
                    <th className="col-pri">Priority</th>
                    <th className="col-status">Status</th>
                    <th className="col-act">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {localTasks.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty">No tasks — click Generate Plan or Quick Add</td>
                    </tr>
                  )}

                  {localTasks.map((t, i) => (
                    <tr key={t._id || `local-${i}`} className="task-row">
                      <td>
                        <div className="task-title">{t.title || 'Untitled'}</div>
                        <div className="task-desc">{t.description || ''}</div>
                      </td>

                      <td>{t.subject || 'General'}</td>

                      <td>
                        <input
                          type="date"
                          value={t.start ? (new Date(t.start)).toISOString().slice(0, 10) : ''}
                          onChange={(e) => handleChangeDue(t._id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                          style={{ padding: 6, borderRadius: 6, border: '1px solid #eee' }}
                        />
                      </td>

                      <td>
                        <select
                          value={t.priority || 3}
                          onChange={(e) => handleChangePriority(t._id, e.target.value)}
                          style={{ padding: 6, borderRadius: 6, border: '1px solid #eee' }}
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </td>

                      <td>
                        <select
                          value={t.status || 'todo'}
                          onChange={(e) => handleChangeStatus(t._id, e.target.value)}
                          style={{ padding: 6, borderRadius: 6, border: '1px solid #eee' }}
                        >
                          <option value="todo">To do</option>
                          <option value="in-progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>

                      <td>
                        <div className="row-actions">
                          <button className="link" onClick={() => { setEditingTask(t); }}>Rename</button>
                          <button className="link" onClick={() => handleStartFocus(t)}>Start Focus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pn-card-foot">
              <div>Tasks: <strong>{localTasks.length}</strong></div>
              <div>Est load: <strong>{Math.round((localTasks.reduce((s,x)=>s + (x.durationMin||30),0))/60)} hrs</strong></div>
              <div>
                <button className="pn-btn pn-btn-ghost" onClick={handleQuickAdd}>Quick Add</button>
              </div>
            </div>
          </div>
        </section>

        <aside className="pn-right">
          <div className="pn-card">
            <h3>Today</h3>
            <ul className="today-list">
              {localTasks.slice(0, 5).map((t, i) => (
                <li key={t._id || i} className="today-item">
                  <div className="dot" />
                  <div className="today-content">
                    <div className="today-title">{t.title}</div>
                    <div className="today-meta">{t.durationMin || 30} min • {t.subject || 'General'}</div>
                  </div>
                </li>
              ))}

              {localTasks.length === 0 && <li className="empty">No tasks for today</li>}
            </ul>

            <div className="mt-4">
              <button
                className="pn-btn pn-btn-primary full"
                onClick={() => {
                  // open FocusMode for the first task if available
                  if (localTasks && localTasks.length > 0) setFocusTask(localTasks[0]);
                  else alert('No task to start focus on — add a task first.');
                }}
              >
                Start Focus
              </button>
            </div>
          </div>

          <div className="pn-card">
            <h3>Subject Mastery</h3>
            <div className="bar-row">
              <div className="bar-label">Maths</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: '80%' }} /></div>
            </div>

            <div className="bar-row">
              <div className="bar-label">English</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: '60%' }} /></div>
            </div>
          </div>
        </aside>
      </main>

      {/* Focus Mode modal (opened when focusTask is set) */}
      {focusTask && (
        <FocusMode
          task={focusTask}
          plannerId={planner._id}
          onClose={() => setFocusTask(null)}
          onSessionEnd={() => { qc.invalidateQueries('planner'); setFocusTask(null); }}
        />
      )}

      {/* Edit modal */}
      {editingTask && (
        <div className="pn-modal">
          <div className="pn-modal-card">
            <h4>Edit Task</h4>
            <label>Title</label>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <div className="modal-actions" style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="pn-btn pn-btn-ghost" onClick={() => setEditingTask(null)}>Cancel</button>
              <button className="pn-btn pn-btn-primary" onClick={handleSaveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
