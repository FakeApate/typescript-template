import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
	const i = 15;
	ns.tprint(ns.formatNumber(ns.getPurchasedServerUpgradeCost("pserv-0",2**i)));
	ns.tprint(ns.formatNumber(ns.getPurchasedServerUpgradeCost("pserv-1",2**i)));
	ns.tprint(ns.formatNumber(ns.getPurchasedServerUpgradeCost("pserv-2",2**i)));
	ns.tprint(ns.formatNumber(ns.getPurchasedServerUpgradeCost("pserv-3",2**i)));
	ns.tprint(ns.formatNumber(ns.getPurchasedServerUpgradeCost("pserv-4",2**i)));
	ns.upgradePurchasedServer("pserv-0",2**i)
	ns.upgradePurchasedServer("pserv-1",2**i)
	ns.upgradePurchasedServer("pserv-2",2**i)
	ns.upgradePurchasedServer("pserv-3",2**i)
	ns.upgradePurchasedServer("pserv-4",2**i)
}
