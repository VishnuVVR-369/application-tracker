/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analyses from "../analyses.js";
import type * as analysesNode from "../analysesNode.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as experience from "../experience.js";
import type * as experienceNode from "../experienceNode.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as referrals from "../referrals.js";
import type * as resumes from "../resumes.js";
import type * as resumesNode from "../resumesNode.js";
import type * as settings from "../settings.js";
import type * as suggestions from "../suggestions.js";
import type * as suggestionsNode from "../suggestionsNode.js";
import type * as writingAi from "../writingAi.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analyses: typeof analyses;
  analysesNode: typeof analysesNode;
  applications: typeof applications;
  auth: typeof auth;
  experience: typeof experience;
  experienceNode: typeof experienceNode;
  helpers: typeof helpers;
  http: typeof http;
  referrals: typeof referrals;
  resumes: typeof resumes;
  resumesNode: typeof resumesNode;
  settings: typeof settings;
  suggestions: typeof suggestions;
  suggestionsNode: typeof suggestionsNode;
  writingAi: typeof writingAi;
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
