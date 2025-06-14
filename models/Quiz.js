// models/Quiz.js
import mongoose from 'mongoose';

// Question şeması
const questionSchema = new mongoose.Schema({
  text:     { type: String, required: true, trim: true },
  image:    { type: String },
  options:  [{ type: String, required: true, trim: true }],
  correctOption: { type: Number, required: true, min: 0 }
});

// Quiz şeması
const quizSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions:   [questionSchema],
  timeLimit:   { type: Number, required: true, min: 10, max: 300, default: 30 },
  pointsPerQuestion: { type: Number, required: true, min: 10, max: 1000, default: 100 },
  createdAt:   { type: Date, default: Date.now },
  lastModified:{ type: Date, default: Date.now },
  isActive:    { type: Boolean, default: true },
  sessions: [{
    code:       { type: String, required: true },
    startTime:  { type: Date, required: true },
    endTime:   Date,
    participants: [{
      user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name:   String,
      score:  { type: Number, default: 0 },
      answers: [{
        questionIndex: Number,
        answer:        Number,
        isCorrect:     Boolean,
        timeSpent:     Number
      }]
    }]
  }]
});

// lastModified güncellemesi
quizSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Virtual ve metotlar…
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.length * this.pointsPerQuestion;
});
quizSchema.virtual('totalDuration').get(function() {
  return this.questions.length * this.timeLimit;
});
quizSchema.method('getSessionStats', function(sessionCode) { /*…*/ });

// Modeli default export et
const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
