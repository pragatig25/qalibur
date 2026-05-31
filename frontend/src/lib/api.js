const MODE = import.meta.env.VITE_MODE || "live";
const API_URL = import.meta.env.VITE_API_URL || "";
const GITHUB_USER = "pragatig25";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-github-user": GITHUB_USER,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

async function loadFixture(name) {
  const base = import.meta.env.BASE_URL || "/";
  const res = await fetch(`${base}fixtures/${name}`);
  return res.json();
}

export const api = {
  async listRuns() {
    if (MODE === "demo") return loadFixture("runs.json");
    return apiFetch("/api/runs");
  },

  async getRun(id) {
    if (MODE === "demo") {
      const runs = await loadFixture("runs.json");
      return runs.find((r) => r.id === id) || runs[0];
    }
    return apiFetch(`/api/runs/${id}`);
  },

  async createRun(repoUrl, featureDescription) {
    if (MODE === "demo") {
      return { id: "demo-run", status: "running", repoUrl, featureDescription };
    }
    return apiFetch("/api/run", {
      method: "POST",
      body: JSON.stringify({ repoUrl, featureDescription }),
    });
  },

  async approveRun(id) {
    if (MODE === "demo") return { status: "approved" };
    return apiFetch(`/api/runs/${id}/approve`, { method: "POST" });
  },

  async rejectRun(id, note) {
    if (MODE === "demo") return { status: "rejected" };
    return apiFetch(`/api/runs/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  subscribeToLog(id, onMessage) {
    if (MODE === "demo") {
      loadFixture("agent-log.json").then((entries) => {
        let i = 0;
        const interval = setInterval(() => {
          if (i >= entries.length) {
            clearInterval(interval);
            return;
          }
          onMessage(entries[i]);
          i++;
        }, 800);
      });
      return () => {};
    }

    const source = new EventSource(`${API_URL}/api/runs/${id}/log`);
    source.onmessage = (e) => {
      onMessage(JSON.parse(e.data));
    };
    return () => source.close();
  },

  async getArtifacts(id) {
    if (MODE === "demo") return loadFixture("artifacts.json");
    const run = await apiFetch(`/api/runs/${id}`);
    return run.artifacts;
  },

  async getGateReviews(id) {
    if (MODE === "demo") return loadFixture("gate-reviews.json");
    const run = await apiFetch(`/api/runs/${id}`);
    return run.gateReviews;
  },

  async getDefects(id) {
    if (MODE === "demo") return loadFixture("defects.json");
    const run = await apiFetch(`/api/runs/${id}`);
    return run.defects;
  },

  isDemo() {
    return MODE === "demo";
  },

  async health() {
    if (MODE === "demo") return { reachable: false, reason: "demo-build" };
    try {
      const res = await fetch(`${API_URL}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return { reachable: false, reason: `http-${res.status}` };
      const body = await res.json();
      return { reachable: true, ...body };
    } catch (err) {
      return {
        reachable: false,
        reason: err.name === "TimeoutError" ? "timeout" : "network",
      };
    }
  },
};
