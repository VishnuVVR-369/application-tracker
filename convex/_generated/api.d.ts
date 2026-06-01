/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as analytics from "../analytics.js";
import type * as appData from "../appData.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as dashboard from "../dashboard.js";
import type * as exportData from "../exportData.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as quality from "../quality.js";
import type * as reminders from "../reminders.js";
import type * as resumes from "../resumes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  analytics: typeof analytics;
  appData: typeof appData;
  applications: typeof applications;
  auth: typeof auth;
  dashboard: typeof dashboard;
  exportData: typeof exportData;
  goals: typeof goals;
  http: typeof http;
  quality: typeof quality;
  reminders: typeof reminders;
  resumes: typeof resumes;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
