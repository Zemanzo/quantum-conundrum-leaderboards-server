import type Database from "./database/Database";
import Connector from "./connector/Connector";

const connector = new Connector();

export async function initialize(db: Database) {
  const levelCount = db.preparedStatements.select.levelCount.get();

  if (levelCount?.["Count(*)"] === 0) {
    console.log("Populating database with levels");

    const levels = await connector.getLevels();
    db.beginTransaction();
    for (const level of levels.data) {
      db.preparedStatements.insert.level.run([level.id, level.name]);
    }
    db.commitTransaction();
  }

  await updateAllRuns(db);
  await updateAllUsers(db);
}

export async function updateAllRuns(db: Database) {
  const levels = db.preparedStatements.select.allLevels.all();

  db.beginTransaction();

  const promises = levels.map((level) =>
    addLevelRunsToDatabase(level.apiId, db)
  );
  await Promise.allSettled(promises);

  db.commitTransaction();
}

export async function addLevelRunsToDatabase(level: string, db: Database) {
  const { data: runs } = await connector.getLevelRuns(level);

  const formattedRuns: ReturnType<typeof createRunObject>[] = [];
  for (const run of runs) {
    const runDetails = [
      run.id,
      run.level,
      run.players[0].id,
      run.values.r8rg5zrn === "5q8ze9gq" ? 0 : 1, // lag abuse, "5q8ze9gq" is NO lag abuse used.
      run.times.primary_t,
      run.date || run.submitted.substring(0, run.submitted.indexOf("T")),
      run?.videos?.links?.[0]?.uri ??
        (run?.videos?.text ? `https://${run.videos.text}` : ""),
    ] as const;
    db.preparedStatements.insert.run.run(runDetails);
    formattedRuns.push(createRunObject(runDetails));
  }

  return formattedRuns;
}

function createRunObject(
  values: readonly [string, string, string, 0 | 1, number, string, string]
) {
  return {
    apiId: values[0],
    levelId: values[1],
    userId: values[2],
    lagAbuse: values[3],
    "min(time)": values[4],
    date: values[5],
    videoLink: values[6],
  };
}

/**
 * Updates all users by extracting all unique users for all runs.
 */
export async function updateAllUsers(db: Database) {
  const usersFromRuns = db.preparedStatements.select.usersWithRuns.all();

  db.beginTransaction();

  const promises = usersFromRuns.map((user) =>
    addUsersToDatabase(user.userId, db)
  );
  await Promise.allSettled(promises);

  db.commitTransaction();
}

async function addUsersToDatabase(userId: string, db: Database) {
  const { data: user } = await connector.getUser(userId);

  db.preparedStatements.insert.user.run([
    user.id,
    user.names.international,
    user.weblink,
  ]);
}
