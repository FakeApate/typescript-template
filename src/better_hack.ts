import { NS, AutocompleteData } from "@ns";
import { Batch } from "lib/batch/Batch";
import { Runner } from "/lib/batch/Runner";
import { Target } from "/lib/batch/Target";
const TARGET_HOSTNAME = "n00dles";

export async function main(ns: NS): Promise<void> {
	ns.tail();
	ns.disableLog("sleep");
	ns.clearLog();
	const pServs: Runner[] = [];
	for(const ps of ns.getPurchasedServers()){
		pServs.push(new Runner(ns, ps, 0))
	}
	const target = new Target(ns.getServer(ns.args[0] as string), 1)
	const batch = new Batch("Batch 0", pServs, target);
	await batch.prepare(ns);
	await batch.run(ns);
}
export function autocomplete(data: AutocompleteData, args: unknown) {
    return data.servers;
}