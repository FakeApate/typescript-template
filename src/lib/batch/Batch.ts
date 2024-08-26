//import { t, StateMachine, Callback } from "external_modules/typescript-fsm/stateMachine";
import { NS } from "@ns";
import { Runner } from "lib/batch/Runner";
import { Target } from "lib/batch/Target";
import { Job, JobFactory, JobProps, JobType } from "/lib/batch/Job";
const DELAY = 40;

export class Batch {
	id: string;
	runners: Runner[];
	target: Target;

	constructor(id: string, runners: Runner[], target: Target) {
		if (runners.length === 0) throw new Error("There must be at least one runner!");
		this.id = id;
		this.runners = runners;
		this.target = target;
	}

	async prepare(ns: NS) {
		let jobs = shedulePrepareMin(ns, this.target, this.runners);
		jobs.forEach((j) => j.execute(ns));
		await waitForJobs(ns, jobs);

		jobs = shedulePrepareMax(ns, this.target, this.runners);
		jobs.forEach((j) => j.execute(ns));
		await waitForJobs(ns, jobs);
	}

	async run(ns: NS) {
		while (true) {
			const jobs = scheduleHWGWs(ns, this.target, this.runners);
			jobs.forEach((j) => j.execute(ns));
			await waitForJobs(ns, jobs);
			await ns.sleep(200);
		}
	}
}

function shedulePrepareMax(ns: NS, target: Target, runners: Runner[]): Job[] {
	target.update(ns);
	runners.forEach((r) => r.update(ns));

	if (!target.isMaxMoney()) {
		const moneyMult = target.getMoneyMulitplier();
		const growThreads = Math.ceil(target.getGrowInfo(ns, moneyMult)[0] / runners.length);

		const infos = runners.map((r) => {
			const actualmoneySecInc = ns.growthAnalyzeSecurity(
				growThreads,
				target.hostname,
				r.cpuCores,
			);
			const weakGrowThreads = r.getSecCompensation(actualmoneySecInc);
			const weakRam = weakGrowThreads * r.ramPerThread.Weak;
			const growRam = growThreads * r.ramPerThread.Grow;
			const weakenTime = r.executionTime.Weak(target);
			const growTime = r.executionTime.Grow(target);
			const longestDelay = Math.max(weakenTime, growTime);
			return {
				hostname: r.hostname,
				weakGrowThreads: weakGrowThreads,
				weakRam: weakRam,
				growRam: growRam,
				weakenTime: weakenTime,
				growTime: growTime,
				longestDelay: longestDelay,
			};
		});

		const actualLongestDelay = Math.max(...infos.map((i) => i.longestDelay));
		const jobs = infos
			.map((i) => {
				let weakDelay = actualLongestDelay - i.weakenTime;
				let growDelay = actualLongestDelay - i.growTime;
				if (growDelay >= DELAY) {
					growDelay -= DELAY;
				} else {
					weakDelay += DELAY;
				}

				const weakGrowProps: JobProps = [
					"Prep WeakGrow",
					target.hostname,
					i.hostname,
					weakDelay,
					i.weakGrowThreads,
					i.weakRam,
					i.weakenTime + weakDelay,
				];
				const growProps: JobProps = [
					"Prep Grow",
					target.hostname,
					i.hostname,
					growDelay,
					growThreads,
					i.growRam,
					i.growTime + growDelay,
				];
				const weakJob = JobFactory.createJob(JobType.Weaken, ...weakGrowProps);
				const growJob = JobFactory.createJob(JobType.Grow, ...growProps);
				return [growJob, weakJob];
			})
			.flat();

		return jobs;
	}
	return [];
}

function shedulePrepareMin(ns: NS, target: Target, runners: Runner[]): Job[] {
	target.update(ns);
	runners.forEach((r) => r.update(ns));
	if (!target.isMinimumSecurity()) {
		const secPerThread = Math.min(...runners.map((r) => r.securityChangePerThread.Weak()));
		const targetSecDelta = target.getSecurityDecrease();
		const weakThreads = Math.ceil(targetSecDelta / secPerThread / runners.length);
		const jobs = runners.map((r) => {
			const weakProps: JobProps = [
				"PrepWeak ",
				target.hostname,
				r.hostname,
				0,
				weakThreads,
				weakThreads * r.ramPerThread.Weak,
				r.executionTime.Weak(target),
			];
			return JobFactory.createJob(JobType.Weaken, ...weakProps);
		});

		return jobs;
	}
	return [];
}

interface IRunnerInfo {
	hostname: string;
	hackTime: number;
	weakenTime: number;
	growTime: number;
	weakGrowThreads: number;
	weakHackThreads: number;
	hackThreads: number;
	growThreads: number;
	longestDelay: number;
	hackDelay: number;
	growDelay: number;
	weakHackDelay: number;
	weakGrowDelay: number;
	weakHackRam: number;
	weakGrowRam: number;
	growRam: number;
	hackRam: number;
	batchRam: number;
	maxRuns: number;
}

function runnerHWGW(ns: NS, target: Target, runner: Runner): IRunnerInfo {
	runner.update(ns);

	const hackTime = runner.executionTime.Hack(target);
	const weakenTime = runner.executionTime.Weak(target);
	const growTime = runner.executionTime.Grow(target);
	const longestDelay = Math.max(hackTime, weakenTime, growTime);
	let hackDelay = longestDelay - hackTime;
	let weakHackDelay = longestDelay - weakenTime + DELAY;
	let growDelay = longestDelay - growTime + DELAY * 2;
	let weakGrowDelay = longestDelay - weakenTime + DELAY * 3;

	if (hackDelay >= DELAY) {
		hackDelay -= DELAY;
		weakHackDelay -= DELAY;
		growDelay -= DELAY;
		weakGrowDelay -= DELAY;
	}

	// Thread calculations
	const [hackThreads, hackSecInc, moneyMult] = target.getHackInfo(ns);
	const weakHackThreads = runner.getSecCompensation(hackSecInc) + 2;
	const [growThreads, moneySecInc] = target.getGrowInfo(ns, moneyMult, runner.cpuCores);
	const weakGrowThreads = runner.getSecCompensation(moneySecInc) + 2;

	if (Math.min(weakHackThreads, weakGrowThreads, growThreads, hackThreads) === 0)
		throw new Error(`Not enough ram`);

	//Ram calculations
	const weakHackRam = weakHackThreads * runner.ramPerThread.Weak;
	const weakGrowRam = weakGrowThreads * runner.ramPerThread.Weak;
	const growRam = growThreads * runner.ramPerThread.Grow;
	const hackRam = hackThreads * runner.ramPerThread.Hack;
	const batchRam = weakHackRam + weakGrowRam + growRam + hackRam;

	//Run Calculations
	const maxRuns = Math.floor(runner.getAvailableRam() / batchRam);

	return {
		hostname: runner.hostname,
		hackTime: hackTime,
		weakenTime: weakenTime,
		growTime: growTime,
		weakGrowThreads: weakGrowThreads,
		weakHackThreads: weakHackThreads,
		hackThreads: hackThreads,
		growThreads: growThreads,
		longestDelay: longestDelay,
		hackDelay: hackDelay,
		growDelay: growDelay,
		weakHackDelay: weakHackDelay,
		weakGrowDelay: weakGrowDelay,
		weakHackRam: weakHackRam,
		weakGrowRam: weakGrowRam,
		growRam: growRam,
		hackRam: hackRam,
		batchRam: batchRam,
		maxRuns: maxRuns,
	};
}
function scheduleHWGWs(ns: NS, target: Target, runners: Runner[]): Job[] {
	target.update(ns);
	runners.forEach((r) => r.update(ns));

	const hackTime = runners[0].executionTime.Hack(target);
	const weakenTime = runners[0].executionTime.Weak(target);
	const growTime = runners[0].executionTime.Grow(target);
	const longestDelay = Math.max(hackTime, weakenTime, growTime);
	let hackDelay = longestDelay - hackTime;
	let weakHackDelay = longestDelay - weakenTime + DELAY;
	let growDelay = longestDelay - growTime + DELAY * 2;
	let weakGrowDelay = longestDelay - weakenTime + DELAY * 3;

	if (hackDelay >= DELAY) {
		hackDelay -= DELAY;
		weakHackDelay -= DELAY;
		growDelay -= DELAY;
		weakGrowDelay -= DELAY;
	}

	// Thread calculations
	const [hackThreads, hackSecInc, moneyMult] = target.getHackInfo(ns);
	const weakHackThreads = runners[0].getSecCompensation(hackSecInc) + 2;
	const [growThreads, moneySecInc] = target.getGrowInfo(ns, moneyMult);
	const weakGrowThreads = runners[0].getSecCompensation(moneySecInc) + 2;

	//Ram calculations
	const weakHackRam = weakHackThreads * runners[0].ramPerThread.Weak;
	const weakGrowRam = weakGrowThreads * runners[0].ramPerThread.Weak;
	const growRam = growThreads * runners[0].ramPerThread.Grow;
	const hackRam = hackThreads * runners[0].ramPerThread.Hack;
	const batchRam = weakHackRam + weakGrowRam + growRam + hackRam;
	const runnersRam = runners.map((r) => r.maxRam).reduce((vp, vc) => vp + vc);
	if (batchRam > runnersRam) {
		throw new Error("Not enough Ram!");
	}

	//Run Calculations
	const maxRuns = Math.min(Math.floor(runnersRam / batchRam),20);
	const jobSchedule: Job[] = [];
	for (let i = 0; i < maxRuns; i++) {
		const batchDelay = DELAY * 5 * i;
		if (batchDelay >= longestDelay ) break;
		const weakers1 = runners.map((r) => {
			const weakHackProps: JobProps = [
				"WeakHack " + i,
				target.hostname,
				r.hostname,
				weakHackDelay + batchDelay,
				Math.max(Math.ceil(weakHackThreads / runners.length),1),
				weakHackRam / runners.length,
				weakenTime + weakHackDelay + batchDelay,
			];
			return JobFactory.createJob(JobType.Weaken, ...weakHackProps);
		});
		const weakers2 = runners.map((r) => {
			const weakGrowProps: JobProps = [
				"WeakGrow " + i,
				target.hostname,
				r.hostname,
				weakGrowDelay + batchDelay,
				Math.max(Math.ceil(weakGrowThreads / runners.length),1),
				weakGrowRam / runners.length,
				weakenTime + weakGrowDelay + batchDelay,
			];
			return JobFactory.createJob(JobType.Weaken, ...weakGrowProps);
		});
		const hackers = runners.map((r) => {
			const hackProps: JobProps = [
				"Hack " + i,
				target.hostname,
				r.hostname,
				hackDelay + batchDelay,
				Math.max(Math.floor(hackThreads / runners.length),1),
				hackRam / runners.length,
				hackTime + hackDelay + batchDelay,
			];
			return JobFactory.createJob(JobType.Hack, ...hackProps);
		});
		const growers = runners.map((r) => {
			const growProps: JobProps = [
				"Grow " + i,
				target.hostname,
				r.hostname,
				growDelay + batchDelay,
				Math.max(Math.ceil(growThreads / runners.length),1),
				growRam / runners.length,
				growTime + growDelay + batchDelay,
			];
			return JobFactory.createJob(JobType.Grow, ...growProps);
		});
		jobSchedule.push(...weakers1, ...weakers2, ...hackers, ...growers);
	}
	return jobSchedule;
}
function scheduleHWGW(ns: NS, target: Target, runner: Runner): Job[] {
	target.update(ns);
	runner.update(ns);
	const hackTime = runner.executionTime.Hack(target);
	const weakenTime = runner.executionTime.Weak(target);
	const growTime = runner.executionTime.Grow(target);
	const longestDelay = Math.max(hackTime, weakenTime, growTime);
	let hackDelay = longestDelay - hackTime;
	let weakHackDelay = longestDelay - weakenTime + DELAY;
	let growDelay = longestDelay - growTime + DELAY * 2;
	let weakGrowDelay = longestDelay - weakenTime + DELAY * 3;

	if (hackDelay >= DELAY) {
		hackDelay -= DELAY;
		weakHackDelay -= DELAY;
		growDelay -= DELAY;
		weakGrowDelay -= DELAY;
	}

	// Thread calculations
	const [hackThreads, hackSecInc, moneyMult] = target.getHackInfo(ns);
	const weakHackThreads = runner.getSecCompensation(hackSecInc) + 2;
	const [growThreads, moneySecInc] = target.getGrowInfo(ns, moneyMult, runner.cpuCores);
	const weakGrowThreads = runner.getSecCompensation(moneySecInc) + 2;

	//Ram calculations
	const weakHackRam = weakHackThreads * runner.ramPerThread.Weak;
	const weakGrowRam = weakGrowThreads * runner.ramPerThread.Weak;
	const growRam = growThreads * runner.ramPerThread.Grow;
	const hackRam = hackThreads * runner.ramPerThread.Hack;
	const batchRam = weakHackRam + weakGrowRam + growRam + hackRam;

	//Run Calculations
	const maxRuns = Math.floor(runner.getAvailableRam() / batchRam);
	const jobSchedule: Job[] = [];
	for (let i = 0; i < maxRuns; i++) {
		const batchDelay = DELAY * 5 * i;
		const weakHackProps: JobProps = [
			"WeakHack " + i,
			target.hostname,
			runner.hostname,
			weakHackDelay + batchDelay,
			weakHackThreads,
			weakHackRam,
			weakenTime + weakHackDelay + batchDelay,
		];
		const weakGrowProps: JobProps = [
			"WeakGrow " + i,
			target.hostname,
			runner.hostname,
			weakGrowDelay + batchDelay,
			weakGrowThreads,
			weakGrowRam,
			weakenTime + weakGrowDelay + batchDelay,
		];
		const hackProps: JobProps = [
			"Hack " + i,
			target.hostname,
			runner.hostname,
			hackDelay + batchDelay,
			hackThreads,
			hackRam,
			hackTime + hackDelay + batchDelay,
		];
		const growProps: JobProps = [
			"Grow " + i,
			target.hostname,
			runner.hostname,
			growDelay + batchDelay,
			growThreads,
			growRam,
			growTime + growDelay + batchDelay,
		];
		const weakHackJob = JobFactory.createJob(JobType.Weaken, ...weakHackProps);
		const weakGrowJob = JobFactory.createJob(JobType.Weaken, ...weakGrowProps);
		const hackJob = JobFactory.createJob(JobType.Hack, ...hackProps);
		const growJob = JobFactory.createJob(JobType.Grow, ...growProps);
		jobSchedule.push(hackJob, weakHackJob, growJob, weakGrowJob);
	}
	return jobSchedule;
}

async function waitForJobs(ns: NS, jobs: Job[], checkInterval = 900): Promise<void> {
	while (jobs.some((job) => job.isRunning(ns))) {
		ns.clearLog();

		for (const job of jobs) {
			ns.print(`[${job.id}][${job.runner}] ${job.getRemainingEstimate(ns)}`);
		}

		await ns.sleep(checkInterval);
	}
}
