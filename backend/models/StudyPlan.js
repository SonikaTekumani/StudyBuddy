const mongoose = require('mongoose');


const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    subject: String,
    durationMin: Number,
    start: Date,
    end: Date,
    priority: { type: Number, default: 3 },
    status: { type: String, enum: ['todo','in-progress','done'], default: 'todo' }
});


const studyPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    tasks: [taskSchema],
    meta: Object,
    snapshotAt: Date
}, { timestamps: true });


module.exports = mongoose.model('StudyPlan', studyPlanSchema);