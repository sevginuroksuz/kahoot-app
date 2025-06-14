import mongoose from 'mongoose';

// Question şeması
const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  choices: {
    type: [String],
    required: true,
    validate: [arr => arr.length >= 2, 'En az iki seçenek olmalı']  // en az iki seçenek olsun
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
    validate: {
      validator: function(i) {
        return i >= 0 && i < this.choices.length;
      },
      message: 'correctAnswerIndex, choices dizisinin uzunluğu içinde olmalı'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Modeli default export et
const Question = mongoose.model('Question', questionSchema);
export default Question;
