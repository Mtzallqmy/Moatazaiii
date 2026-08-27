import { defineRailway, project, service } from "railway/iac";

export default defineRailway(() => {
  const web = service("telegram-search-web", {
    build: "pnpm build",
    start: "pnpm start",
    healthcheck: "/health",
  });

  return project("telegram-global-search", {
    resources: [web],
  });
});
