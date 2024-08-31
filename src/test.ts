import { NS } from "@ns";

function calculateThreads(ns: NS, hostname: string, hackPercentage: number, moneyMax: number) {
	const hackAmount = ns.hackAnalyze(hostname); // Get the part of money stolen with a single thread. Percentage of total Money.
	const hackThreads = Math.ceil(hackPercentage / hackAmount);
	//const hackChance = ns.hackAnalyzeChance(target.hostname) // Get the chance of successfully hacking a server.
	const hackSecurityIncrease = ns.hackAnalyzeSecurity(hackThreads, hostname); // Get the security increase for a number of threads.  The number of threads is limited to the number needed to hack the server's maximum amount of money.
	const growThreads = Math.ceil(ns.growthAnalyze(hostname, moneyMax)); // Calculate the number of grow threads needed for a given multiplicative growth factor.
	const growSecurityIncrease = ns.growthAnalyzeSecurity(growThreads); // Calculate the security increase for a number of grow threads.
	const securityDecrease = ns.weakenAnalyze(1); // Predict the effect of weaken.
	const hackSecurityDecreaseThreads = Math.ceil(hackSecurityIncrease / securityDecrease);
	const hackSecurityDecrease = ns.weakenAnalyze(hackSecurityDecreaseThreads)-hackSecurityIncrease >= 0;
	const growSecurityDecreaseThreads = Math.ceil(growSecurityIncrease / securityDecrease);
	const growSecurityDecrease = ns.weakenAnalyze(growSecurityDecreaseThreads) - growSecurityIncrease >= 0;

	ns.tprint("hackAmount:                   " + hackAmount);
	ns.tprint("hackThreads:                  " + hackThreads);
	ns.tprint("hackSecurityIncrease:         " + hackSecurityIncrease);
	ns.tprint("growThreads:                  " + growThreads);
	ns.tprint("growSecurityIncrease:         " + growSecurityIncrease);
	ns.tprint("securityDecrease:             " + securityDecrease);
	ns.tprint("hackSecurityDecreaseThreads:  " + hackSecurityDecreaseThreads);
	ns.tprint("hackSecurityDecrease:         " + hackSecurityDecrease);
	ns.tprint("growSecurityDecreaseThreads:  " + growSecurityDecreaseThreads);
	ns.tprint("growSecurityDecrease:         " + growSecurityDecrease);
}

export async function main(ns: NS): Promise<void> {
	const server = ns.args[0] as string;
	calculateThreads(ns, server, 1, ns.getServerMaxMoney(server));
}

export function autocomplete(data: unknown, args: unknown) {
	return data.servers;
}
