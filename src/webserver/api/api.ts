import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { addLevelRunsToDatabase } from "../../run";
import { getBody } from "../util";

/**
 * Cooldown in milliseconds until a level can be updated.
 */
const UPDATE_COOLDOWN = 1000 * 60;
/**
 * Cooldown in milliseconds until a new attempt at submitting a record can be done.
 */
const SUBMIT_COOLDOWN = 1000 * 60 * 15;

async function routes(fastify: FastifyInstance) {
  fastify.get("/api/runs", async (req, res) => {
    const runs = fastify.db.preparedStatements.select.allFastestRuns
      .all([0])
      .reduce(getRemoveObsoletedRunsReducer(3), []);
    const shifts = fastify.db.preparedStatements.select.allBestShifts
      .all([0])
      .reduce(getRemoveObsoletedRunsReducer(1), []);
    res.code(200).send({ runs, shifts });
  });

  fastify.get("/api/users", async (req, res) => {
    const users = fastify.db.preparedStatements.select.allUsers.all();
    res.code(200).send(users);
  });

  /**
   * Update level
   */
  const lastUpdate: { [key: string]: number } = {};
  fastify.get<{
    Params: {
      id?: string;
    };
  }>("/api/updateLevel/:id", async (req, res) => {
    if (req.params.id) {
      const shifts =
        fastify.db.preparedStatements.select.levelShiftsNoAbuse.all([
          req.params.id,
        ]);
      if (lastUpdate[req.params.id] > Date.now() - UPDATE_COOLDOWN) {
        const runs =
          fastify.db.preparedStatements.select.levelFastestRunsNoAbuse.all([
            req.params.id,
          ]);
        res.code(200).send({ runs, shifts });
      } else {
        const runs = await addLevelRunsToDatabase(req.params.id, fastify.db);
        const filteredRuns = runs
          .sort((a, b) => a["min(time)"] - b["min(time)"])
          .reduce<typeof runs>((accumulator, run) => {
            if (
              run.lagAbuse === 0 &&
              run.userId &&
              accumulator.length < 3 &&
              accumulator.findIndex(
                (filteredRun) => filteredRun.userId === run.userId
              ) === -1
            ) {
              accumulator.push(run);
            }
            return accumulator;
          }, []);
        lastUpdate[req.params.id] = Date.now();
        res.code(200).send({ runs: filteredRuns, shifts });
      }
    } else {
      res.code(400).send({ error: "Request is malformed" });
    }
  });

  let failedSubmitAttempts = 0;
  let lastFailedDate = 0;
  fastify.post("/api/submit", async (req, res) => {
    if (
      failedSubmitAttempts < 5 &&
      lastFailedDate < Date.now() - SUBMIT_COOLDOWN
    ) {
      failedSubmitAttempts = 0;
      lastFailedDate = 0;
      const body = getBody(req, res);
      if (
        body.levelId &&
        body.userId &&
        !isNaN(body.shifts) &&
        body.shifts >= 0 &&
        (await isPasswordValid(body.password))
      ) {
        try {
          fastify.db.preparedStatements.insert.shift.run([
            body.levelId,
            body.userId,
            body.lagAbuse,
            body.shifts,
            Date.now(),
            body.videoLink,
          ]);
          res.code(200).send({ success: true });
        } catch (err) {
          console.error(err);
          res.code(500).send({ error: "Internal server error" });
        }
      } else {
        res.code(400).send({ error: "Request is malformed" });
        failedSubmitAttempts++;
        if (failedSubmitAttempts >= 5) {
          lastFailedDate = Date.now();
        }
      }
    } else {
      res.code(429).send({
        error: "Too many incorrect attempts.",
      });
    }
  });
}

async function isPasswordValid(password: any) {
  return (
    typeof password === "string" &&
    (await hashPassword(password, "$2b$10$Y/rBUzLiwxDpxzuRj1G9BO")) ===
      "$2b$10$Y/rBUzLiwxDpxzuRj1G9BOLlOUj7tTRYWt6QcZVFylvcdUS8f1vBC"
  );
}

const hashPassword = (password: string, salt: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, salt, (err: any, hash: string) => {
      if (!err && hash) {
        return resolve(hash);
      } else {
        return reject(err);
      }
    });
  });
};

function getRemoveObsoletedRunsReducer(maxRuns: number) {
  const levels: Record<string, number> = {};
  return function removeObsoletedRuns(filteredRuns: any[], run: any) {
    if ((levels?.[run.levelId] ?? 0) < maxRuns) {
      filteredRuns.push(run);
      if (levels[run.levelId]) {
        levels[run.levelId]++;
      } else {
        levels[run.levelId] = 1;
      }
    }
    return filteredRuns;
  };
}

export default routes;
