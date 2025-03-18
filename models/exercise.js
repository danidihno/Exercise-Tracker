const mongoose = require("mongoose");

let exerciseSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  description: String,
  duration: Number,
  date: Date,
});

module.exports = mongoose.model("Exercise", exerciseSchema);
