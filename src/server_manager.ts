import { NS } from "@ns";

interface PServ {
	name: string;
	owned: boolean;
}
export async function main(ns: NS): Promise<void> {
	const servers = ns.getPurchasedServers();
	const sLimit = 25;
	const rLimit = 2 ** 20;
	const pServers: PServ[] = [];
	const ramLevels: number[] = [];
	for (let i = 0; i < 25; i++) {
		pServers.push({
			name: "pserv-" + i,
			owned: servers.find((n) => n == "pserv-" + i) !== undefined,
		});
	}

	for (let i = 1; i <= 20; i++) {
		ramLevels.push(2 ** i);
	}


	/*for (const s of pServers) {
		ns.tprint(`[${s.name}] ${s.owned}`);
	}*/

	for( const server of servers){
		ns.tprint(`[${server}] ${ns.formatRam(ns.getServerMaxRam(server))}`)
	}
    for(const s in ramLevels){
        ns.tprint(`${ns.formatRam(ramLevels[s])} (${Number(s)+1}): ${ns.formatNumber(ns.getPurchasedServerCost(ramLevels[s]))}`)
    }
}
