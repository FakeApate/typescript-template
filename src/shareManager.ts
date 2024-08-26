import { NS } from "@ns";

export async function main(ns: NS) {
  ns.disableLog("sleep")
	const ramCost = ns.getScriptRam("share.js", "home");
	const server = ns.getServer("home");
	const threads = Math.floor((server.maxRam - server.ramUsed - 200) / ramCost);
	while (true) {
		const pid =  ns.exec("share.js", server.hostname, threads);
    while (ns.getRunningScript(pid)) {
      await ns.sleep(500);
    }
    await ns.sleep(100);
  }
}
