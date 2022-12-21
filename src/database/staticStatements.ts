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
  users: `
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT UNIQUE,
      userName TEXT,
      webLink TEXT,
      PRIMARY KEY("userId")
    )
  `,
};

export const staticStatements = {
  beginTransaction: "BEGIN TRANSACTION",
  commitTransaction: "COMMIT TRANSACTION",
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
    user: `
        INSERT OR REPLACE INTO users (
          userId,
          userName,
          webLink
        ) VALUES(?,?,?)
      `,
  },
  select: {
    usersWithRuns: `SELECT DISTINCT userId FROM runs WHERE userId IS NOT NULL`,
    allLevels: `SELECT * FROM levels`,
    levelCount: `SELECT Count(*) FROM levels`,
    allFastestRunsNoAbuse: `
      SELECT levelId, userId, videoLink, min(time)
      FROM runs r
      WHERE
        r.apiId IN (
          SELECT apiId
          FROM runs
          WHERE levelId = r.levelId AND lagAbuse = 0
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
    allUsers: `SELECT * FROM users`,
  },
} as const;
