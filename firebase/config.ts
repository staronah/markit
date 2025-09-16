import { FirebaseApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { Auth } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { Database } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// The Firebase app is initialized in index.html and attached to the window object
const firebase = (window as any).firebase as {
  app: FirebaseApp;
  auth: Auth;
  database: Database;
};

export const app = firebase.app;
export const auth = firebase.auth;
export const db = firebase.database;