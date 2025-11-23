// frontend/src/pages/PlannerPage.jsx
// Dependencies: react, react-query, react-beautiful-dnd, date-fns, ../api.js (as provided)
// Make sure you have those installed and QueryClientProvider is wrapping your app.

import React, { useState } from 'react';
import AdvancedPlannerEditor from '../components/AdvancedPlannerEditor';
import { useQuery, useQueryClient } from 'react-query';
import { getPlanner, generatePlanner, updatePlan, startSession, stopSession } from '../api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format } from 'date-fns';

function PlannerPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery('planner', getPlanner, { refetchOnWindowFocus: false });
  const [selectedTask, setSelectedTask] = useState(null);
  const [localEditTitle, setLocalEditTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [session, setSession] = useState(null);

  // NEW: Advanced Editor modal state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const planner = data?.plan;
  const tasks = planner?.tasks || [];

  // Utility to reorder array after drag-and-drop
  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  // Drag end handler (optimistic update + server update)
  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = reorder(tasks, result.source.index, result.destination.index);

    // Optimistic update
    qc.setQueryData('planner', (old) => {
      if (!old) return old;
      return { ...old, plan: { ...old.plan, tasks: reordered } };
    });

    try {
      await updatePlan(planner._id, { tasks: reordered });
      // optionally refetch to ensure consistency
      qc.invalidateQueries('planner');
    } catch (err) {
      console.error('updatePlan error', err);
      qc.invalidateQueries('planner');
    }
  };

  // Simple generate plan action (demo payload)
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        goals: [
          { title: 'Revise calculus', durationMin: 45 },
          { title: 'Practice coding', durationMin: 60 }
        ],
      };
      const res = await generatePlanner(payload);
      qc.setQueryData('planner', res);
    } catch (err) {
      console.error('generatePlanner error', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Start a study session for a task
  const handleStart = async (task) => {
    try {
      const res = await startSession({ planId: planner._id, taskId: task._id });
      setSession(res.session);
    } catch (err) {
      console.error('startSession error', err);
    }
  };

  // Stop the current session
  const handleStop = async () => {
    if (!session) return;
    try {
      await stopSession({ sessionId: session._id, notes: '', mood: 'neutral' });
      setSession(null);
      qc.invalidateQueries('planner');
    } catch (err) {
      console.error('stopSession error', err);
    }
  };

  // Open edit modal for a task
  const openEdit = (task) => {
    // make a shallow copy for editing
    setSelectedTask({ ...task });
    setLocalEditTitle(task.title || '');
  };

  // Save edits for the selected task
  const saveEdit = async () => {
    if (!selectedTask) return;
    const updatedTask = { ...selectedTask, title: localEditTitle };
    const updatedTasks = tasks.map((t) => (t._id === updatedTask._id ? updatedTask : t));

    // optimistic UI
    qc.setQueryData('planner', (old) => {
      if (!old) return old;
      return { ...old, plan: { ...old.plan, tasks: updatedTasks } };
    });

    try {
      await updatePlan(planner._id, { tasks: updatedTasks });
      qc.invalidateQueries('planner');
    } catch (err) {
      console.error('updatePlan (saveEdit) error', err);
      qc.invalidateQueries('planner');
    } finally {
      setSelectedTask(null);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading planner...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Planner</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Plan'}
          </button>
          <button className="btn" onClick={() => qc.invalidateQueries('planner')}>Refresh</button>

          {/* NEW: Open Advanced Editor */}
          <button className="btn" onClick={() => setIsAdvancedOpen(true)}>Advanced Editor</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Tasks column */}
        <div className="col-span-2">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="tasks">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {tasks.map((t, idx) => (
                    <Draggable key={t._id} draggableId={String(t._id)} index={idx}>
                      {(prov) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="p-4 bg-white shadow rounded"
                        >
                          <div className="flex justify-between">
                            <div>
                              <div className="font-semibold">{t.title}</div>
                              <div className="text-sm text-gray-500">{t.subject || 'General'} • {t.durationMin || 30} min</div>
                              {t.start && (
                                <div className="text-xs text-gray-400">{format(new Date(t.start), 'PPpp')}</div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button className="btn" onClick={() => openEdit(t)}>Edit</button>
                              <button className="btn" onClick={() => handleStart(t)}>Start</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Right rail */}
        <div>
          <div className="p-4 bg-white shadow rounded">
            <h3 className="font-semibold">Today</h3>
            <div className="mt-2">
              <ul className="space-y-2">
                {tasks.slice(0, 5).map((t) => (
                  <li key={t._id} className="text-sm">
                    {t.title} — {t.durationMin || 30} min
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              {session ? (
                <div>
                  <div>Session running: {session._id}</div>
                  <button className="btn mt-2" onClick={handleStop}>Stop Session</button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No active session</div>
              )}
            </div>
          </div>

          <div className="mt-4 p-4 bg-white shadow rounded">
            <h3 className="font-semibold">Planner Actions</h3>
            <button
              className="btn mt-2"
              onClick={() => {
                const tempId = `temp-${Date.now()}`;
                const newTasks = [{ _id: tempId, title: 'Quick task', durationMin: 25 }, ...tasks];
                qc.setQueryData('planner', (old) => {
                  if (!old) return old;
                  return { ...old, plan: { ...old.plan, tasks: newTasks } };
                });
              }}
            >
              Quick Add
            </button>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {selectedTask && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-4 rounded w-96">
            <h3 className="font-semibold">Edit Task</h3>

            <div className="mt-2">
              <label className="block text-xs">Title</label>
              <input
                className="w-full border p-2"
                value={localEditTitle}
                onChange={(e) => setLocalEditTitle(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setSelectedTask(null)}>Close</button>
              <button className="btn" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Advanced Planner Editor Modal */}
      {isAdvancedOpen && planner && (
        <AdvancedPlannerEditor
          isOpen={isAdvancedOpen}
          onClose={() => setIsAdvancedOpen(false)}
          plan={planner}
          onSaved={() => qc.invalidateQueries('planner')}
        />
      )}
    </div>
  );
}

export default PlannerPage;
