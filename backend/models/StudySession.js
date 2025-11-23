const mongoose = require('mongoose');


const studySessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyPlan' },
    taskId: mongoose.Schema.Types.ObjectId,
    startedAt: Date,
    stoppedAt: Date,
    notes: String,
    mood: String
}, { timestamps: true });


module.exports = mongoose.model('StudySession', studySessionSchema);