import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
	const u = 10;
	let cost = 0;
	for (let i = 0; i < 25; i++) {
		const hostname = "pserv-" + i;
		const upgradeCost = ns.getPurchasedServerUpgradeCost(hostname, 2 ** u);
		cost += Math.max(0,upgradeCost);
		ns.tprint(`${hostname} ${ns.formatNumber(upgradeCost)}`);
	}
	ns.tprint(`Sum: ${ns.formatNumber(cost)}`)
}
