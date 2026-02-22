import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Sync stripe data",
  { seconds: 5 }, // every ten seconds
  api.fetchEventsAction2.syncEventsAction,
);

export default crons;
