import { NS } from "@ns";

/**
 * Parses the arguments and validates their type.
 * @param ns Netscript Context
 * @returns The parsed arguments
 */
export function parseArguments(ns: NS): [string, number, number] {
	const args = ns.flags([
		["hostname", "n00dles"],
		["delay", 0],
		["threads", 1],
	]);

	const hostname = args.hostname;
	const delay = args.delay;
	const threads = args.threads;

	if (typeof hostname !== "string" || typeof delay !== "number" || typeof threads !== "number") {
		throw new Error("Arguments types do not match");
	}

	return [hostname, delay, threads];
}
