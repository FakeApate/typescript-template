import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
	//ns.tprint(ns.formatNumber(ns.getPurchasedServerUpgradeCost("pserv-0",2**12)));
	for(let i = 0; i < 25; i++){
		const hostname = "pserv-"+i;
		if(!ns.serverExists(hostname)) {
			ns.tprint(ns.formatNumber(ns.getPurchasedServerCost(2**10)))
			ns.purchaseServer("pserv-"+i,2**10)
		}
	}
	
}
