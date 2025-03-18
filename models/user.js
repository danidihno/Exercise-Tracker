const mongoose = require("mongoose");

let userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Users_", userSchema);