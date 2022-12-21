import { FastifyInstance } from "fastify";
import { addLevelRunsToDatabase } from "../../run";

/**
 * Cooldown in milliseconds until a level can be updated.
 */
const UPDATE_COOLDOWN = 1000 * 60;

async function routes(fastify: FastifyInstance) {
  fastify.get("/api/runs", async (req, res) => {
    const runs = fastify.db.preparedStatements.select.allFastestRunsNoAbuse
      .all()
      .reduce(getRemoveObsoletedRunsReducer(), []);
    res.code(200).send(runs);
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
      if (lastUpdate[req.params.id] > Date.now() - UPDATE_COOLDOWN) {
        const runs =
          fastify.db.preparedStatements.select.levelFastestRunsNoAbuse.all([
            req.params.id,
          ]);
        res.code(200).send(runs);
      } else {
        const runs = await addLevelRunsToDatabase(req.params.id, fastify.db);
        const filteredRuns = runs
          .sort((a, b) => a["min(time)"] - b["min(time)"])
          .reduce<typeof runs>((accumulator, run) => {
            if (
              run.lagAbuse === 0 &&
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
        res.code(200).send(filteredRuns);
      }
    } else {
      res.code(400).send({ error: "Request is malformed" });
    }
  });
}

function getRemoveObsoletedRunsReducer() {
  const levels: Record<string, number> = {};
  return function removeObsoletedRuns(filteredRuns: any[], run: any) {
    if ((levels?.[run.levelId] ?? 0) < 3) {
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
