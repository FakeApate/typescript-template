import { Scripts } from "lib/batch/formulas";
import { NS, RunOptions, ScriptArg } from "@ns";

/**
 * Enum representing job types
 */
export enum JobType {
	Weaken = "Weaken",
	Grow = "Grow",
	Hack = "Hack",
}

export type JobProps = [
	id: string,
	target: string,
	runner: string,
	delay: number,
	threads: number,
	ram: number,
	expectedEndTime: number,
];

/**
 * Base Job class
 */
export abstract class Job {
	id: string;
	target: string;
	runner: string;
	delay: number;
	threads: number;
	ram: number;
	expectedEndTime: number;

	pid?: number;
	abstract type: JobType;
	abstract script: string;

	constructor(
		id: string,
		target: string,
		runner: string,
		delay: number,
		threads: number,
		ram: number,
		expectedEndTime: number,
	) {
		this.id = id;
		this.target = target;
		this.delay = delay;
		this.threads = threads;
		this.ram = ram;
		this.expectedEndTime = expectedEndTime;
		this.runner = runner;
	}

	execute(ns: NS): boolean {
		const runOptions: RunOptions = {
			preventDuplicates: false,
			threads: this.threads,
		};

		const scriptArgs: ScriptArg[] = [
			"--hostname",
			this.target,
			"--threads",
			this.threads,
			"--delay",
			this.delay,
		];

		this.pid = ns.exec(this.script, this.runner, runOptions, ...scriptArgs);
		return this.pid > 0;
	}

	isRunning(ns: NS): boolean {
		return this.update(ns)[0];
	}

	getScriptRuntime(ns: NS): number {
		return this.update(ns)[1];
	}

	getRemainingEstimate(ns: NS): string {
		const runtime = this.update(ns)[1];
		let time = 0;
		if (runtime > 0) time = this.expectedEndTime - runtime;
		return ns.tFormat(time, true) 
	}

	private update(ns: NS): [boolean, number] {
		let isRunning = false;
		let runtime = -1;
		if (this.pid) {
			const script = ns.getRunningScript(this.pid);
			if (script) {
				isRunning = true;
				runtime = script.onlineRunningTime*1000;
			} else {
				this.pid = undefined;
			}
		}
		return [isRunning, runtime];
	}
}

/**
 * Derived Job classes for Weaken
 */
export class WeakenJob extends Job {
	type = JobType.Weaken;
	script = Scripts.Weak;
}

/**
 * Derived Job classes for Grow
 */
export class GrowJob extends Job {
	script = Scripts.Grow;
	type = JobType.Grow;
}

/**
 * Derived Job classes for Hack
 */
export class HackJob extends Job {
	script = Scripts.Hack;
	type = JobType.Hack;
}

/**
 * JobFactory to create jobs based on the provided JobType
 */
export class JobFactory {
	static createJob(type: JobType, ...props: JobProps): Job {
		switch (type) {
			case JobType.Weaken:
				return new WeakenJob(...props);
			case JobType.Hack:
				return new HackJob(...props);
			case JobType.Grow:
				return new GrowJob(...props);
			default:
				throw new Error(`Unknown job type: ${type}`);
		}
	}
}
