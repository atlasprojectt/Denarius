import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16.3 appends a managed block to AGENTS.md and CLAUDE.md on `next dev`.
  // Both are the project constitution and a locked file under PARALLEL.md §3 —
  // a dev server must not rewrite them, in any worktree.
  agentRules: false,
};

export default nextConfig;
