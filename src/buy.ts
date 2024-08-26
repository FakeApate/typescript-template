import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
	//ns.tprint(ns.formatNumber(ns.getPurchasedServerUpgradeCost("pserv-0",2**12)));
	for(let i = 5; i < 25; i++){
		ns.purchaseServer("pserv-"+i,2**15)
	}
	
}
