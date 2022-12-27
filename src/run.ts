import type Database from "./database/Database";
import Connector from "./connector/Connector";
import shiftsJson from "./shifts.json";

/**
 * How much time in seconds
 */
const TIME_UNTIL_UPDATE = 1000 * 60 * 60 * 24;

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

  const currentTimeInSeconds = Date.now() / 1000;
  const requiresUpdate = db.preparedStatements.select.allMeta
    .all()
    .reduce<Record<string, boolean>>((meta, entry) => {
      meta[entry.tableId] =
        entry.lastUpdate < currentTimeInSeconds - TIME_UNTIL_UPDATE;
      return meta;
    }, {});

  if (requiresUpdate.runs) {
    await updateAllRuns(db);
  }
  if (requiresUpdate.users) {
    await updateAllUsers(db);
  }
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
    if (run.status.status === "verified") {
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
    } else {
      db.preparedStatements.delete.run.run([run.id]);
    }
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

/**
 * Gets a single user by ID and stores it in the database.
 */
async function addUsersToDatabase(userId: string, db: Database) {
  const { data: user } = await connector.getUser(userId);

  db.preparedStatements.insert.user.run([
    user.id,
    user.names.international,
    user.weblink,
    getUserColor(user),
  ]);
}

function getUserColor(
  user: Awaited<ReturnType<typeof connector.getUser>>["data"]
) {
  switch (user?.["name-style"]?.style) {
    case "gradient":
      return user["name-style"]?.["color-from"]?.dark;
    case "solid":
      return user["name-style"]?.color.dark;
    default:
      return null;
  }
}

type User = {
  userId: string;
  userName: string;
  webLink: string;
};
/**
 * Should only run if you need to import JSON. Call it at the end of the
 * initialize function to run on startup.
 */
//@ts-ignore
function insertFromJSON(db: Database) {
  const levels = db.preparedStatements.select.allLevels.all();
  const users: User[] = db.preparedStatements.select.allUsers.all();

  for (let i = 0; i < levels.length; i++) {
    const entry = shiftsJson[i];
    if (!entry.user) {
      continue;
    }
    const { userId } = users.find((user) => user.userName === entry.user) ?? {
      userId: entry.user,
    };
    db.preparedStatements.insert.shift.run([
      levels[i].apiId,
      userId,
      0,
      entry.amount,
      Date.now(),
      entry.shiftUrl,
    ]);
  }
}
