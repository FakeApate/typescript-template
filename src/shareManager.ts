import { NS } from "@ns";

export async function main(ns: NS) {
	ns.disableLog("sleep");
	const ramCost = ns.getScriptRam("share.js", "home");
	const pServers = ns.getPurchasedServers().map((s) => {
		const serv = ns.getServer(s);
		const threads = 75000;
		return {
			hostname: serv.hostname,
			threads: threads,
		};
	});

	pServers.forEach((s) => {
		ns.scp("share.js", s.hostname, "home");
	});
	while (true) {
		const pids = pServers.map((p) => {
			return ns.exec("share.js", p.hostname, p.threads);
		});
		while (pids.some((pid) => ns.getRunningScript(pid) !== null)) {
			await ns.sleep(500);
		}
		await ns.sleep(100);
	}
}
