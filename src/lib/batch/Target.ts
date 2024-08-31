import { NS, Server } from "@ns";
import { SECURITY_DELTA, MONEY_DELTA, IFunctionInfo, getExecutionTimes2 } from "lib/batch/formulas";

function validate(server: Server): asserts server is Server & {
	moneyMax: number;
	moneyAvailable: number;
	hackDifficulty: number;
	minDifficulty: number;
} {
	if (server.moneyMax === undefined) throw new Error("moneyMax is undefined for selected target");
	if (server.moneyAvailable === undefined)
		throw new Error("moneyAvailable is undefined for selected target");
	if (server.hackDifficulty === undefined)
		throw new Error("hackDifficulty is undefined for selected target");
	if (server.minDifficulty === undefined)
		throw new Error("minDifficulty is undefined for selected target");
}

/**
 * Target class for batching
 */
export class Target {
	hostname: string;
	hackDifficulty: number;
	minDifficulty: number;
	moneyAvailable: number;
	moneyMax: number;
	hackPercentage: number;

	constructor(server: Server, hackPercentage: number) {
		validate(server);
		this.hostname = server.hostname;
		this.hackDifficulty = server.hackDifficulty;
		this.minDifficulty = server.minDifficulty;
		this.moneyAvailable = server.moneyAvailable;
		this.moneyMax = server.moneyMax;
		this.hackPercentage = hackPercentage;
		
	}

	update(ns: NS) {
		const server = ns.getServer(this.hostname);
		validate(server);
		this.hackDifficulty = server.hackDifficulty;
		this.minDifficulty = server.minDifficulty;
		this.moneyAvailable = server.moneyAvailable;
		this.moneyMax = server.moneyMax;
	}

	getSecurityDecrease(): number {
		return this.hackDifficulty - this.minDifficulty;
	}

	getMoneyMulitplier(): number {
		return Math.max(this.moneyMax / (this.moneyAvailable + 1), 1);
	}

	isMinimumSecurity(): boolean {
		return Math.abs(this.minDifficulty - this.hackDifficulty) < SECURITY_DELTA;
	}

	isMaxMoney(): boolean {
		return Math.abs(this.moneyAvailable - this.moneyMax) < MONEY_DELTA;
	}

	getHackInfo(ns: NS): [number, number, number] {
		const hackThreads = Math.floor(ns.hackAnalyzeThreads(this.hostname, this.moneyMax));
		const hackSecInc = ns.hackAnalyzeSecurity(hackThreads);
		const moneyDec = this.moneyMax * (ns.hackAnalyze(this.hostname) * hackThreads);
		const moneyMult = Math.max(this.moneyMax / (this.moneyMax - moneyDec), 1);
		return [hackThreads, hackSecInc, moneyMult];
	}

	getGrowInfo(ns: NS, moneyMult: number, cores = 1): [number, number] {
		const growThreads = Math.max(Math.ceil(ns.growthAnalyze(this.hostname, moneyMult, cores)), 1);
		const secInc = ns.growthAnalyzeSecurity(growThreads, undefined, cores);
		return [growThreads, secInc];
	}
}
