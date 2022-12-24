export const createStatements = {
  levels: `
    CREATE TABLE IF NOT EXISTS levels (
      apiId TEXT UNIQUE,
      title TEXT,
      PRIMARY KEY("apiId")
    )
  `,
  runs: `
    CREATE TABLE IF NOT EXISTS runs (
      apiId TEXT UNIQUE,
      levelId TEXT,
      userId TEXT,
      lagAbuse INTEGER,
      time REAL,
      date TEXT,
      videoLink TEXT,
      PRIMARY KEY("apiId")
    )
  `,
  shifts: `
    CREATE TABLE IF NOT EXISTS shifts (
      levelId TEXT,
      userId TEXT,
      lagAbuse INTEGER,
      shifts INTEGER,
      date TEXT,
      videoLink TEXT
    )
  `,
  users: `
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT UNIQUE,
      userName TEXT,
      webLink TEXT,
      color TEXT,
      PRIMARY KEY("userId")
    )
  `,
  meta: `
    CREATE TABLE IF NOT EXISTS meta (
      tableId TEXT UNIQUE,
      lastUpdate NUMBER,
      PRIMARY KEY("tableId")
    )
  `,
};

export const staticStatements = {
  beginTransaction: "BEGIN TRANSACTION",
  commitTransaction: "COMMIT TRANSACTION",
  trigger: {
    lastUpdateUsers: `
      CREATE TRIGGER IF NOT EXISTS lastUpdateUsers
        AFTER INSERT ON users
        BEGIN
          INSERT OR REPLACE INTO meta (
            tableId,
            lastUpdate
          )
          VALUES ('users', unixepoch('now'));
        END
    `,
    lastUpdateRuns: `
      CREATE TRIGGER IF NOT EXISTS lastUpdateRuns
        AFTER INSERT ON runs
        BEGIN
          INSERT OR REPLACE INTO meta (
            tableId,
            lastUpdate
          )
          VALUES ('runs', unixepoch('now'));
        END
    `,
  },
  insert: {
    level: `
      INSERT OR REPLACE INTO levels (
        apiId,
        title
      ) VALUES(?,?)
    `,
    run: `
      INSERT OR REPLACE INTO runs (
        apiId,
        levelId,
        userId,
        lagAbuse,
        time,
        date,
        videoLink
      ) VALUES(?,?,?,?,?,?,?)
    `,
    shift: `
      INSERT OR REPLACE INTO shifts (
        levelId,
        userId,
        lagAbuse,
        shifts,
        date,
        videoLink
      ) VALUES(?,?,?,?,?,?)
    `,
    user: `
        INSERT OR REPLACE INTO users (
          userId,
          userName,
          webLink,
          color
        ) VALUES(?,?,?,?)
      `,
  },
  select: {
    // Levels
    allLevels: `SELECT * FROM levels`,
    levelCount: `SELECT Count(*) FROM levels`,
    // Runs
    allFastestRuns: `
      SELECT levelId, userId, videoLink, min(time)
      FROM runs r
      WHERE
        r.apiId IN (
          SELECT apiId
          FROM runs
          WHERE levelId = r.levelId AND lagAbuse = ?
          ORDER BY time
        )
        AND userId IS NOT NULL
      GROUP BY levelId, userId
      ORDER BY time
    `,
    levelFastestRunsNoAbuse: `
      SELECT levelId, userId, videoLink, min(time)
      FROM runs r
      WHERE
        r.apiId IN (
          SELECT apiId
          FROM runs
          WHERE levelId = ? AND lagAbuse = 0
          ORDER BY time
        )
        AND userId IS NOT NULL
      GROUP BY levelId, userId
      ORDER BY time
    `,
    // Shifts
    allBestShifts: `
      SELECT levelId, userId, videoLink, min(shifts)
      FROM shifts
      WHERE lagAbuse = ?
        OR lagAbuse IS NULL
      GROUP BY levelId
      ORDER BY shifts
    `,
    levelShiftsNoAbuse: `
      SELECT levelId, userId, videoLink, min(shifts)
      FROM shifts
      WHERE (lagAbuse = 0 OR lagAbuse IS NULL)
        AND levelId = ?
      ORDER BY shifts
      LIMIT 1
    `,
    // Other
    usersWithRuns: `SELECT DISTINCT userId FROM runs WHERE userId IS NOT NULL`,
    allUsers: `SELECT * FROM users`,
    allMeta: `SELECT * FROM meta`,
  },
} as const;
