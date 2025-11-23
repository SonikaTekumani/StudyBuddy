// AdvancedPlannerEditor.jsx
// Usage:
// <AdvancedPlannerEditor
//    isOpen={isModalOpen}
//    onClose={() => setIsModalOpen(false)}
//    plan={planner}                // planner object from GET /planner
//    onSaved={() => qc.invalidateQueries('planner')} // optional callback
// />
//
// Depends: react, react-query, updatePlan from ../api

import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { updatePlan } from '../api';

export default function AdvancedPlannerEditor({ isOpen, onClose, plan, onSaved }) {
  const qc = useQueryClient();
  const [localPlan, setLocalPlan] = useState(null);
  const [exceptions, setExceptions] = useState([]); // { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
  const [vacations, setVacations] = useState([]);   // array of 'YYYY-MM-DD'
  const [saving, setSaving] = useState(false);
  const mutation = useMutation(({ planId, payload }) => updatePlan(planId, payload));

  useEffect(() => {
    if (isOpen) {
      // clone plan into local state
      setLocalPlan(plan ? JSON.parse(JSON.stringify(plan)) : null);
      // initialize exceptions/vacations from plan.meta if present
      setExceptions((plan?.meta?.exceptions) ? JSON.parse(JSON.stringify(plan.meta.exceptions)) : []);
      setVacations((plan?.meta?.vacations) ? JSON.parse(JSON.stringify(plan.meta.vacations)) : []);
    }
  }, [isOpen, plan]);

  if (!isOpen) return null;

  const updateTaskField = (taskId, field, value) => {
    setLocalPlan((p) => {
      if (!p) return p;
      const p2 = { ...p, tasks: p.tasks.map((t) => (t._id === taskId ? { ...t, [field]: value } : t)) };
      return p2;
    });
  };

  const addException = () => {
    setExceptions((e) => [...e, { from: '', to: '' }]);
  };

  const updateException = (idx, key, value) => {
    setExceptions((e) => {
      const copy = [...e];
      copy[idx][key] = value;
      return copy;
    });
  };

  const removeException = (idx) => {
    setExceptions((e) => e.filter((_, i) => i !== idx));
  };

  const addVacation = () => {
    setVacations((v) => [...v, '']);
  };

  const updateVacation = (idx, value) => {
    setVacations((v) => {
      const copy = [...v];
      copy[idx] = value;
      return copy;
    });
  };

  const removeVacation = (idx) => {
    setVacations((v) => v.filter((_, i) => i !== idx));
  };

  // Simple auto-scheduler: assign start times sequentially skipping exceptions/vacations
  const autoSchedule = () => {
    if (!localPlan) return;
    // start from today 18:00 by default, assign tasks sequentially
    const tasks = JSON.parse(JSON.stringify(localPlan.tasks || []));
    const now = new Date();
    // find next working day not in exceptions or vacations
    const isBlocked = (dateISO) => {
      const dateOnly = dateISO.slice(0, 10);
      if (vacations.includes(dateOnly)) return true;
      for (const ex of exceptions) {
        if (!ex.from || !ex.to) continue;
        if (dateOnly >= ex.from && dateOnly <= ex.to) return true;
      }
      return false;
    };

    let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0); // today 18:00
    // advance to first non-blocked day
    const advanceToNextAvailableDay = () => {
      let attempts = 0;
      while (isBlocked(cursor.toISOString()) && attempts < 365) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(18, 0, 0, 0);
        attempts++;
      }
    };

    advanceToNextAvailableDay();

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const dur = (t.durationMin && Number.isFinite(t.durationMin)) ? t.durationMin : 30;
      const start = new Date(cursor);
      const end = new Date(cursor.getTime() + dur * 60 * 1000);

      // if end goes past 22:00, move to next day 18:00
      if (end.getHours() >= 22) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(18, 0, 0, 0);
        advanceToNextAvailableDay();
        i = i - 1; // schedule this task again in next loop iteration
        continue;
      }

      t.start = start.toISOString();
      t.end = end.toISOString();

      // move cursor forward 10min break after task
      cursor = new Date(end.getTime() + 10 * 60 * 1000);
    }

    setLocalPlan((p) => ({ ...p, tasks }));
  };

  const validateBeforeSave = () => {
    // basic validation: ensure no exception has from > to, vacations are valid dates
    for (const ex of exceptions) {
      if (!ex.from || !ex.to) return { ok: false, msg: 'Fill exception date ranges' };
      if (ex.from > ex.to) return { ok: false, msg: 'Exception start must be <= end' };
    }
    for (const v of vacations) {
      if (!v) return { ok: false, msg: 'Fill vacation dates or remove empty entries' };
    }
    return { ok: true };
  };

  const handleSave = async () => {
    const val = validateBeforeSave();
    if (!val.ok) {
      alert(val.msg);
      return;
    }

    setSaving(true);
    try {
      // Attach exceptions/vacations to meta
      const payload = {
        ...localPlan,
        meta: {
          ...(localPlan.meta || {}),
          exceptions: exceptions.filter((e) => e.from && e.to),
          vacations: vacations.filter((d) => d)
        }
      };

      await mutation.mutateAsync({ planId: localPlan._id, payload });
      // optimistic: invalidate and close
      qc.invalidateQueries('planner');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('save error', err);
      alert('Failed to save plan. See console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg w-[95%] max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Advanced Planner Editor</h2>
            <div className="text-sm text-gray-500">Priority sliders, Exceptions, Vacation days & Auto-scheduler</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded bg-gray-100"
              onClick={() => {
                // reset local edits
                setLocalPlan(plan ? JSON.parse(JSON.stringify(plan)) : null);
                setExceptions((plan?.meta?.exceptions) ? JSON.parse(JSON.stringify(plan.meta.exceptions)) : []);
                setVacations((plan?.meta?.vacations) ? JSON.parse(JSON.stringify(plan.meta.vacations)) : []);
              }}
            >
              Reset
            </button>
            <button className="px-3 py-1 rounded bg-red-500 text-white" onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Left: Tasks + priority sliders */}
          <div>
            <h3 className="font-semibold mb-2">Tasks & Priority</h3>
            <div className="space-y-2">
              {localPlan?.tasks?.map((t, idx) => (
                <div key={t._id || `task-${idx}`} className="p-3 border rounded bg-gray-50">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-medium">{t.title || 'Untitled task'}</div>
                      <div className="text-xs text-gray-500">{t.subject || 'General'}</div>
                      <div className="text-xs text-gray-400 mt-1">Duration: {t.durationMin || 30} min</div>
                      {t.start && (
                        <div className="text-xs text-gray-400 mt-1">Scheduled: {new Date(t.start).toLocaleString()}</div>
                      )}
                    </div>

                    <div className="w-36">
                      <label className="text-xs text-gray-600">Priority</label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={t.priority || 3}
                        onChange={(e) => updateTaskField(t._id, 'priority', Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-center mt-1"> {t.priority || 3} </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Exceptions & vacations */}
          <div>
            <h3 className="font-semibold mb-2">Exceptions (Blocked Date Ranges)</h3>

            <div className="space-y-2 mb-4">
              {exceptions.map((ex, idx) => (
                <div key={`ex-${idx}`} className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <label className="text-xs">From</label>
                    <input
                      type="date"
                      value={ex.from}
                      onChange={(e) => updateException(idx, 'from', e.target.value)}
                      className="border p-1 rounded"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs">To</label>
                    <input
                      type="date"
                      value={ex.to}
                      onChange={(e) => updateException(idx, 'to', e.target.value)}
                      className="border p-1 rounded"
                    />
                  </div>

                  <button
                    className="px-2 py-1 bg-red-100 text-red-700 rounded h-8"
                    onClick={() => removeException(idx)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded" onClick={addException}>
                + Add Exception
              </button>
            </div>

            <h3 className="font-semibold mb-2">Vacation Days</h3>
            <div className="space-y-2">
              {vacations.map((v, idx) => (
                <div key={`vac-${idx}`} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={v}
                    onChange={(e) => updateVacation(idx, e.target.value)}
                    className="border p-1 rounded"
                  />
                  <button className="px-2 py-1 bg-red-100 text-red-700 rounded h-8" onClick={() => removeVacation(idx)}>
                    Remove
                  </button>
                </div>
              ))}
              <button className="mt-2 px-3 py-1 bg-green-600 text-white rounded" onClick={addVacation}>
                + Add Vacation Day
              </button>
            </div>
          </div>

          {/* Bottom row: scheduler, analytics preview */}
          <div className="col-span-2 mt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <button
                  className="px-4 py-2 bg-indigo-600 text-white rounded mr-2"
                  onClick={autoSchedule}
                >
                  Auto-schedule (simple)
                </button>

                <button
                  className="px-4 py-2 bg-gray-200 rounded"
                  onClick={() => {
                    // quick heuristic analytics: total minutes and estimated weekly load
                    const totalMin = (localPlan?.tasks || []).reduce((s, t) => s + (t.durationMin || 30), 0);
                    const estWeeks = Math.max(1, Math.ceil(totalMin / (5 * 60 * 60))); // rough
                    alert(`Total planned time: ${totalMin} min (~${Math.round(totalMin/60)} hrs). Estimated weeks: ${estWeeks}`);
                  }}
                >
                  Preview Mini-Analytics
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-gray-100 rounded"
                  onClick={() => {
                    // discard and close
                    onClose();
                  }}
                >
                  Cancel
                </button>

                <button
                  className="px-4 py-2 bg-green-600 text-white rounded"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
