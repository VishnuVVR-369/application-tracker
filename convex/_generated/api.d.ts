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
import type * as appData from "../appData.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as exportData from "../exportData.js";
import type * as ghosting from "../ghosting.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as interviews from "../interviews.js";
import type * as matchAnalysis from "../matchAnalysis.js";
import type * as matchAnalysisData from "../matchAnalysisData.js";
import type * as model from "../model.js";
import type * as offers from "../offers.js";
import type * as prep from "../prep.js";
import type * as quality from "../quality.js";
import type * as resumes from "../resumes.js";
import type * as seed from "../seed.js";
import type * as stories from "../stories.js";
import type * as targets from "../targets.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  appData: typeof appData;
  applications: typeof applications;
  auth: typeof auth;
  contacts: typeof contacts;
  crons: typeof crons;
  exportData: typeof exportData;
  ghosting: typeof ghosting;
  goals: typeof goals;
  http: typeof http;
  interviews: typeof interviews;
  matchAnalysis: typeof matchAnalysis;
  matchAnalysisData: typeof matchAnalysisData;
  model: typeof model;
  offers: typeof offers;
  prep: typeof prep;
  quality: typeof quality;
  resumes: typeof resumes;
  seed: typeof seed;
  stories: typeof stories;
  targets: typeof targets;
  tasks: typeof tasks;
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
