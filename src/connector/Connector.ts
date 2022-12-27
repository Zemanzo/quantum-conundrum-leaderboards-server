/// <reference lib="dom" />

type LevelsResponse = {
  data: Array<{
    id: string;
    name: string;
    weblink: string;
    rules: null;
    links: unknown;
  }>;
};

type RunsResponse = {
  data: Array<{
    id: string;
    weblink: string;
    game: string;
    level: string;
    category: string;
    videos?: {
      text?: string;
      links?: Array<{ uri: string }>;
    };
    status: {
      status: string;
    };
    players: Array<{
      id: string;
    }>;
    date: string;
    submitted: string;
    times: {
      primary_t: number;
    };
    values: {
      /**
       * Lag abuse
       * @example '5q8ze9gq': NO ABUSE
       * @example '21dd4e41': ABUSE
       */
      r8rg5zrn: "5q8ze9gq" | "21dd4e41";
    };
  }>;
};

type UserResponse = {
  data: {
    id: string;
    names: {
      international: string;
      japanese: string | null;
    };
    weblink: string;
    "name-style":
      | {
          style: "solid";
          color: {
            light: string;
            dark: string;
          };
        }
      | {
          style: "gradient";
          "color-from": {
            light: string;
            dark: string;
          };
          "color-to": {
            light: string;
            dark: string;
          };
        };
  };
};

const QC_GAME_ID = "9d3eqg1l";

export default class Connector {
  private async doRequest<TResponse>(
    path: string,
    params?: ConstructorParameters<typeof URLSearchParams>[0]
  ): Promise<TResponse> {
    const qs = new URLSearchParams(params);
    const options = {
      headers: {
        "User-Agent": `nodejs/quantum-condundrum-leaderboards`,
      },
    };

    const response = await fetch(
      `https://www.speedrun.com/api/v1/${path}?${qs}`,
      options
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status} -- Request params: ${qs}`
      );
    }

    return response.json();
  }

  getLevelRuns(levelId: string) {
    return this.doRequest<RunsResponse>("runs", {
      level: levelId,
      max: "200",
    });
  }

  getLevels() {
    return this.doRequest<LevelsResponse>(`games/${QC_GAME_ID}/levels`, {
      max: "200",
    });
  }

  getUser(userId: string) {
    return this.doRequest<UserResponse>(`users/${userId}?max=200`);
  }
}
