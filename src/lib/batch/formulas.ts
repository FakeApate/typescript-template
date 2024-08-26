import { NS } from "@ns";
import { Target } from "lib/batch/Target";
/**
 * Delta within two security values are considered equal.
 */
export const SECURITY_DELTA = 0.1;

/**
 * Delta within two money values are considered equal.
 */
export const MONEY_DELTA = 1000;

/**
 * Paths to the shared scripts
 */
export const Scripts = {
	Weak: "/lib/batch/shared/weak.js",
	Grow: "/lib/batch/shared/grow.js",
	Hack: "/lib/batch/shared/hack.js",
};

/**
 * Ram needed to execute script with one thread.
 */
export interface IRamPerThread {
	Weak: number;
	Grow: number;
	Hack: number;
}

/**
 * The effect one thread of the function has on the security level
 */
export interface ISecurityIncreasePerThread {
	Weak: (threads?: number) => number;
	Grow: (s: Target, threads?: number) => number;
	Hack: (s: Target, threads?: number) => number;
}

/**
 * Time needed to execute each script
 */
export interface IExecutionTime {
	Weak: (s: Target) => number;
	Grow: (s: Target) => number;
	Hack: (s: Target) => number;
}

/**
 * Gets the ram needed to execute one thread from the scripts
 * @param ns Netscript Context
 * @returns RamPerThread
 */
export function getScriptRam(ns: NS): IRamPerThread {
	return {
		Weak: ns.getScriptRam(Scripts.Weak),
		Grow: ns.getScriptRam(Scripts.Grow),
		Hack: ns.getScriptRam(Scripts.Hack),
	};
}

/**
 * Gets the methods to calculate the security increase
 * @param ns Netscript Context
 * @param cores Number of cores of runner
 * @returns Methods
 */
export function getAnalyzeSecurity(ns: NS, cores = 1): ISecurityIncreasePerThread {
	return {
		Weak: (threads = 1) => ns.weakenAnalyze(threads, cores),
		Grow: (s: Target, threads = 1) => ns.growthAnalyzeSecurity(threads, s.hostname, cores),
		Hack: (s: Target, threads = 1) => ns.hackAnalyzeSecurity(threads, s.hostname),
	};
}

/**
 * Gets the time in ms each scripts will run
 * @param ns Netscript Context
 * @returns Times for all scripts
 */
export function getExecutionTimes(ns: NS): IExecutionTime {
	return {
		Weak: (s: Target) => ns.getWeakenTime(s.hostname),
		Grow: (s: Target) => ns.getGrowTime(s.hostname),
		Hack: (s: Target) => ns.getHackTime(s.hostname),
	};
}
