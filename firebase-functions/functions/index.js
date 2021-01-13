const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebase = require("firebase");
const app = require("express")(); //require and call on the same line

admin.initializeApp();

const firebaseConfig = {
  apiKey: "AIzaSyBpQMiAxCOgxSQ2liplsqvZuxZPZgLgdI8",
  authDomain: "family-app-d24c5.firebaseapp.com",
  databaseURL:
    "https://family-app-d24c5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "family-app-d24c5",
  storageBucket: "family-app-d24c5.appspot.com",
  messagingSenderId: "375696775731",
  appId: "1:375696775731:web:240dc09a6ca7dd9aaca146",
  measurementId: "G-BS7DC502BT",
};

firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get("/messages", (req, res) => {
  db.collection("messages")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let messages = [];
      data.forEach((doc) => {
        messages.push({
          messageId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(messages);
    })
    .catch((err) => console.error(err));
});

app.post("/message", (req, res) => {
  const newMessage = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString(),
  };

  db.collection("messages")
    .add(newMessage)
    .then((doc) => {
      res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
});

//Signup route
app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  //TODO validate data
  let token, userId;

  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      // return an authentication token
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

// want to have an api prefix (best practice) https://baseurl.com/api/

// Firebase will deploy to uscentral-01 by default no matter where you are
// From UK this will add 300-400ms of latency on each request
// We can specify where to deploy with the region() function as below
exports.api = functions.region("europe-west1").https.onRequest(app);
