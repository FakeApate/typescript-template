import { NS } from "@ns";
import {
	IFunctionInfo,
	ISecurityIncreasePerThread,
	IExecutionTime,
	getScriptRam,
	getAnalyzeSecurity,
	getExecutionTimes,
} from "lib/batch/formulas";

function copyScripts(ns: NS, hostname: string) {
	if (hostname === "home") return;
	ns.scp(ns.ls("home", "lib/batch/shared"), hostname, "home");
}

/**
 * Runner class
 */
export class Runner {
	hostname: string;
	cpuCores!: number;
	maxRam!: number;
	ramUsed!: number;
	reservedRam = 0;
	ramPerThread!: IFunctionInfo;
	securityChangePerThread!: ISecurityIncreasePerThread;
	executionTime!: IExecutionTime;

	constructor(ns: NS, hostname: string, reservedRam?: number) {
		this.hostname = hostname;
		if (reservedRam) this.reservedRam = reservedRam;
		this.update(ns);
		copyScripts(ns, hostname);
	}

	update(ns: NS) {
		const server = ns.getServer(this.hostname);
		this.maxRam = server.maxRam;
		this.ramUsed = server.ramUsed;
		this.cpuCores = server.cpuCores;
		this.ramPerThread = getScriptRam(ns);
		this.securityChangePerThread = getAnalyzeSecurity(ns, this.cpuCores);
		this.executionTime = getExecutionTimes(ns);
	}

	public getAvailableRam(): number {
		return this.maxRam - this.ramUsed - this.reservedRam;
	}

	/**
	 * Gets the number of threads possible for given RAM/THREAD
	 */
	public getMaxThreads(ns: NS, ramPerThread: number): number {
		return Math.max(0, Math.floor(this.getAvailableRam() / ramPerThread));
	}

	/**
	 * Get threads needed to run weak to compensate the security increase
	 */
	public getSecCompensation(secInc: number): number {
		return Math.max(Math.ceil(secInc / this.securityChangePerThread.Weak()), 1);
	}
}
