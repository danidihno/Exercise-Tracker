const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const fs = require('fs');  // Save dates used by FCC for testing purposes
require("dotenv").config();
const User = require("./models/user");
const Exercise = require("./models/exercise");
//
const mySecret = process.env.DB;
//
mongoose.connect(mySecret, {
  serverSelectionTimeoutMS: 60000,
})
.then(() => {
  console.log("Successfully connected to MongoDB.");
})
.catch((err) => {
  console.error("Connection error", err);
});

// Mount the body parser as middleware

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable cors for FCC to test the application

app.use(cors());

// Mount the middleware to serve the style sheets in the public folder

app.use(express.static("public"));

// Print to the console information about each request made

app.use((req, res, next) => {
  console.log(
    "method: " + req.method + "  |  path: " + req.path + "  |  IP - " + req.ip,
  );
  next();
});

// GET: Display the index page for

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// PATH /api/users/ Requests

app.get("/api/users", async (req, res) => {
  let users = [];
  await User.find({})
    .then( res => {
      console.log(res);
      users = [...res];
    })
    .catch((error) => console.log(error));
  if ( users == null ) {
    console.log("No users found in DB");
    return;
  }
  return res.json(users);
});

app.post("/api/users", async (req, res, next) => {
  let usernameExist = {};
  await User.findOne({ username: req.body.username })
    .then((response) => {
      usernameExist = response;
    })
    .catch((error) => {
      console.log(error);
    });
  //
  if (usernameExist != null) {
    res.status(200).send("User already exists");
    return;
  } else {
    const newUser = new User({
      username: req.body.username,
    });

    //newUser._id = new mongoose.Types.ObjectId();

    // Add new User

    const saveUser = await newUser.save();

    if (!saveUser) {
      console.log("Error saving the user to the DB");
      return;
    }

    return res.status(200).json({
      username: saveUser.username,
      _id: saveUser._id,
    });
  }
});

app.get("/api/users/:_id/exercises", async (req, res) => {
  //
  const id = req.params._id;
  const user = await User.findById(id);
  //
  if (!user) {
    res.json("Invalid userID");
    return;
  } else {
    let obj = {};
    await Exercise.find({ userId: user._id })
      .then((res) => {
        obj = res;
      })
      .catch((error) => console.log(error));
    return res.json(obj);
  }
});

app.get("/api/exercises", async (req, res) => {
  //
  let exercises = {};
  //
  await Exercise.find({})
    .then( res => exercises = res )
    .catch( error => console.log(error) );
   //
   if( exercises == null ) 
    {
    return res.json("No exercises found");
    }
    else 
    {
      return res.json(exercises);
    }
  //
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  
  // Get data from form
  
  const userId = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;

  // Set the date entered to now if the date is not entered

  if (!userId) {
    res.json("Path 'user ID' is required.");
    return;
  }
  if (!description) {
    res.json("Path 'description' is required.");
    return;
  }
  if (!duration) {
    res.json("Path 'duration' is required.");
    return;
  }

  // Check if user ID is in the User model

  let user = {};

  await User.findById(userId)
    .then((response) => {
      user = response;
    })
    .catch((error) => console.log(error));

  if (user === null) {
    return res.json("Invalid userID");
  } else {
    // Create an Exercise object
    let exerciseObj = {
      userId,
      date: date ? (new Date(date)).toDateString() : (new Date()).toDateString(),
      duration,
      description,
    };
    //
    const newExercise = new Exercise(exerciseObj);
    // Save the exercise
    const savedExercise = await newExercise.save();
    //
    if (!savedExercise) return res.json("Exercise not saved successfully");
    // Create JSON object to be sent to the response
    return res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: new Date(savedExercise.date).toDateString(),
    });
    ///
  }
});

// PATH /api/users/:_id/logs?[from][&to][&limit]

app.get("/api/users/:_id/logs", async (req, res, next) => {
  //
  const isDate = /^\d{4}-\d{2}-\d{2}$/;
  const isDigit = /^[0-9]*$/;
  const id = req.params._id;
  let from = isDate.test(req.query.from) ? req.query.from :undefined ;
  let to = isDate.test(req.query.to) ? req.query.to :undefined ;
  const limit = isDigit.test(req.query.limit) ? parseInt(req.query.limit) : undefined;
  //
  const user = await User.findById(id);
//
  if (!user) {
    return res.json("Invalid userID");
  } else {
    
    let queryObj = { userId: user._id };
    let responseObj = {
      _id: user._id,
      username: user.username,
    };

  if( from != undefined || to != undefined)
   { 
     queryObj.date = {};    
    if( from != undefined ) 
    {
      queryObj.date["$gte"] = new Date(from);
      console.log("from", queryObj.date["$gte"]);
    }
    if( to != undefined) {
      queryObj.date["$lte"] = new Date(to);
      console.log("to", queryObj.date["$lte"]);
    }
   }
  // Sort in ascending order
  await Exercise.find(queryObj).sort([['date', 1]]).limit(limit)
      .then((exercises) => {
        let arr = [];
        exercises.reduce((data, elem) => {
          data.push(elem.date.toDateString());
          arr.push({
            duration: elem.duration,
            description: elem.description,
            date: elem.date.toDateString(),
          });
          return data;
        }, []);
   
  fs.appendFile('testResults.txt', `from : ${from} , to : ${to} and limit : ${limit}`, function (err) {
          if (err) throw err;
          console.log('Saved!');
        });
        responseObj.log = arr;
        responseObj.count = arr.length;
        //console.log(responseObj);
      })
      .catch(error => console.log(error));

    res.json(responseObj);

    next();
    
  }
});

// Listen on the proper port to connect to the server

 const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=> console.log(`Server up and running at ${PORT}`));


