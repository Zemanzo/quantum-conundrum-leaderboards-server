import Database from "./database/Database";
import { initialize } from "./run";
import WebServer from "./webserver/WebServer";

console.log("Started Quantum Conundrum Leaderboards Server");

const db = new Database("qcls-data");
initialize(db).then(() => {
  // Create webserver after db has been initialized.
  new WebServer(db);
});
