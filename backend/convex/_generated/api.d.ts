/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as coaches from "../coaches.js";
import type * as cron from "../cron.js";
import type * as players from "../players.js";
import type * as practices from "../practices.js";
import type * as settings from "../settings.js";
import type * as sporteasy from "../sporteasy.js";
import type * as teamGenerator from "../teamGenerator.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  coaches: typeof coaches;
  cron: typeof cron;
  players: typeof players;
  practices: typeof practices;
  settings: typeof settings;
  sporteasy: typeof sporteasy;
  teamGenerator: typeof teamGenerator;
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

export declare const components: {};
