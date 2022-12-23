import Database from "./database/Database";
import { initialize, updateAllRuns, updateAllUsers } from "./run";
import WebServer from "./webserver/WebServer";
import schedule from "node-schedule";

console.log("Started Quantum Conundrum Leaderboards Server");

const db = new Database("qcls-data");
initialize(db).then(() => {
  // Create webserver after db has been initialized.
  new WebServer(db);
});

schedule.scheduleJob("0 4 * * *", fullUpdate);
async function fullUpdate() {
  await updateAllRuns(db);
  await updateAllUsers(db);
}
