import { httpRouter } from "convex/server";
import { syncEventsAction } from "./fetchEventsAction2";
import { syncAction } from "./fetchEventsAction";

const http = httpRouter();

http.route({
  path: "/sync",
  method: "GET",
  handler: syncAction,
});

export default http;
