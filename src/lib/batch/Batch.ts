//import { t, StateMachine, Callback } from "external_modules/typescript-fsm/stateMachine";
import { NS } from "@ns";
import { Runner } from "lib/batch/Runner";
import { Target } from "lib/batch/Target";
import { Job, JobFactory, JobProps, JobType } from "/lib/batch/Job";
const DELAY = 1000;

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
		jobs.forEach((j) => exec(ns, j));
		await waitForJobs(ns, jobs);

		jobs = shedulePrepareMax(ns, this.target, this.runners);
		jobs.forEach((j) => exec(ns, j));
		await waitForJobs(ns, jobs);
	}

	async run(ns: NS) {
		const jobs = scheduleHWGWs(ns, this.target, this.runners);
		while (true) {
			jobs.forEach((j) => exec(ns, j));
			await waitForJobs(ns, jobs);
			await ns.sleep(1000);
		}
	}
}

function exec(ns: NS, job: Job) {
	if (!job.execute(ns)) {
		job.runner;
		const maxRam = ns.getServerMaxRam(job.runner);
		const usedRam = ns.getServerUsedRam(job.runner);
		const needs = ns.formatRam(job.ram);
		const has = ns.formatRam(maxRam - usedRam);
		throw new Error(`Not enough ram, runner needs ${needs} but only has ${has}`);
	}
}
function shedulePrepareMax(ns: NS, target: Target, runners: Runner[]): Job[] {
	target.update(ns);
	runners.forEach((r) => r.update(ns));

	if (!target.isMaxMoney()) {
		const moneyMult = Math.max(target.getMoneyMulitplier() / runners.length, 1);

		const infos = runners.map((r) => {
			const growThreads = target.getGrowInfo(ns, moneyMult)[0];
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
				growThreads: growThreads,
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
					i.growThreads,
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

function scheduleHWGWs(ns: NS, target: Target, runners: Runner[]): Job[] {
	target.update(ns);
	runners.forEach((r) => r.update(ns));

	const timings = calculateTimings(ns, target);
	const threads = calculateThreads(
		ns,
		target.hostname,
		target.hackPercentage,
		target.moneyMax,
		runners[0].cpuCores,
	);

	//Ram calculations
	const weakHackRam = threads.weakhack.threads * runners[0].ramPerThread.Weak;
	const weakGrowRam = threads.weakgrow.threads * runners[0].ramPerThread.Weak;
	const growRam = threads.grow.threads * runners[0].ramPerThread.Grow;
	const hackRam = threads.hack.threads * runners[0].ramPerThread.Hack;
	const batchRam = weakHackRam + weakGrowRam + growRam + hackRam;

	const runnersRam = runners.map((r) => r.maxRam).reduce((vp, vc) => vp + vc);
	if (batchRam > runnersRam) {
		throw new Error("Not enough Ram!");
	}

	//Run Calculations
	const maxRuns = Math.floor(runnersRam / batchRam);
	const timeLimit = Math.floor(timings.batch / DELAY);
	ns.tprint(`maxRuns: ${maxRuns}`);
	ns.tprint(`timeLimit: ${timeLimit}`);
	const runs = Math.min(maxRuns, timeLimit);
	//delay * 2 * i < longestDelay
	const jobSchedule: Job[] = [];
	for (let i = 0; i < runs; i++) {
		const weakers1 = runners.map((r) => {
			const weakHackProps: JobProps = [
				"WeakHack " + i,
				target.hostname,
				r.hostname,
				timings.weakhack.delay + DELAY * i,
				Math.ceil(threads.weakhack.threads / runners.length),
				weakHackRam / runners.length,
				timings.weakhack.duration + DELAY * i,
			];
			return JobFactory.createJob(JobType.Weaken, ...weakHackProps);
		});
		const weakers2 = runners.map((r) => {
			const weakGrowProps: JobProps = [
				"WeakGrow " + i,
				target.hostname,
				r.hostname,
				timings.weakgrow.delay + DELAY * i,
				Math.ceil(threads.weakgrow.threads / runners.length),
				weakGrowRam / runners.length,
				timings.weakgrow.duration + DELAY * i,
			];
			return JobFactory.createJob(JobType.Weaken, ...weakGrowProps);
		});
		const hackers = runners.map((r) => {
			const hackProps: JobProps = [
				"Hack " + i,
				target.hostname,
				r.hostname,
				timings.hack.delay + DELAY * i,
				Math.floor(threads.hack.threads / runners.length),
				hackRam / runners.length,
				timings.hack.duration + DELAY * i,
			];
			return JobFactory.createJob(JobType.Hack, ...hackProps);
		});
		const growers = runners.map((r) => {
			const growProps: JobProps = [
				"Grow " + i,
				target.hostname,
				r.hostname,
				timings.grow.delay + DELAY * i,
				Math.ceil(threads.grow.threads / runners.length),
				growRam / runners.length,
				timings.grow.duration + DELAY * i,
			];
			return JobFactory.createJob(JobType.Grow, ...growProps);
		});
		jobSchedule.push(...weakers1, ...weakers2, ...hackers, ...growers);
	}
	return jobSchedule;
}

async function waitForJobs(ns: NS, jobs: Job[], checkInterval = DELAY): Promise<void> {
	if (jobs.length === 0) return;
	while (jobs.some((job) => job.isRunning(ns))) {
		ns.clearLog();
		const target = ns.getServer(jobs[0].target);
		for (const job of jobs) {
			if (job.isRunning(ns))
				ns.print(`[${job.id}][${job.runner}] ${job.getRemainingEstimate(ns)}`);
		}
		ns.print(`Target: ${target.hostname}`);
		ns.print(
			`Money: ${ns.formatNumber(target.moneyAvailable ?? 0)} of ${ns.formatNumber(
				target.moneyMax ?? 0,
			)}`,
		);
		ns.print(`Security: ${target.hackDifficulty} of ${target.minDifficulty}`);
		await ns.sleep(checkInterval);
	}
}

function calculateThreads(
	ns: NS,
	hostname: string,
	hackPercentage: number,
	moneyMax: number,
	cores = 1,
): {
	hack: { threads: number };
	weakhack: { threads: number };
	grow: { threads: number };
	weakgrow: { threads: number };
} {
	const hackAmount = ns.hackAnalyze(hostname); // Get the part of money stolen with a single thread. Percentage of total Money.
	const hackThreads = Math.ceil(hackPercentage / hackAmount);
	const hackSecurityIncrease = ns.hackAnalyzeSecurity(hackThreads, hostname); // Get the security increase for a number of threads.  The number of threads is limited to the number needed to hack the server's maximum amount of money.
	const growThreads = Math.ceil(ns.growthAnalyze(hostname, moneyMax, cores)); // Calculate the number of grow threads needed for a given multiplicative growth factor.
	const growSecurityIncrease = ns.growthAnalyzeSecurity(growThreads, undefined, cores); // Calculate the security increase for a number of grow threads.
	const securityDecrease = ns.weakenAnalyze(1, cores); // Predict the effect of weaken.
	const hackSecurityDecreaseThreads = Math.ceil(hackSecurityIncrease / securityDecrease);
	const hackSecurityDecrease =
		ns.weakenAnalyze(hackSecurityDecreaseThreads, cores) - hackSecurityIncrease >= 0;
	const growSecurityDecreaseThreads = Math.ceil(growSecurityIncrease / securityDecrease);
	const growSecurityDecrease =
		ns.weakenAnalyze(growSecurityDecreaseThreads, cores) - growSecurityIncrease >= 0;

	if (!hackSecurityDecrease || !growSecurityDecrease) {
		throw new Error(
			"Current calculation is wrong, number of threads would result in increase of security",
		);
	}

	return {
		hack: { threads: hackThreads },
		weakhack: { threads: hackSecurityDecreaseThreads },
		grow: { threads: growThreads },
		weakgrow: { threads: growSecurityDecreaseThreads },
	};
}

function calculateTimings(
	ns: NS,
	target: Target,
): {
	hack: { delay: number; duration: number };
	weakhack: { delay: number; duration: number };
	grow: { delay: number; duration: number };
	weakgrow: { delay: number; duration: number };
	batch: number;
} {
	const baseDelay = DELAY;

	// Function times
	const weakTime = ns.getWeakenTime(target.hostname);
	const growTime = ns.getGrowTime(target.hostname);
	const hackTime = ns.getHackTime(target.hostname);

	// Longes function time
	const maxTime = Math.max(hackTime, weakTime, growTime);

	//Delay calculation
	let hackDelay = maxTime - hackTime + baseDelay * 0; // Finishes first
	let weakHackDelay = maxTime - weakTime + baseDelay * 1; // Finishes second
	let growDelay = maxTime - growTime + baseDelay * 2; // Finishes third
	let weakGrowDelay = maxTime - weakTime + baseDelay * 3; // Finishes last

	//Minimum delay
	const minDelay = Math.min(hackDelay, weakHackDelay, growDelay, weakGrowDelay);

	// Subtract minimum delay to reduce the overall runtime
	hackDelay -= minDelay;
	growDelay -= minDelay;
	weakHackDelay -= minDelay;
	weakGrowDelay -= minDelay;

	//Execution time for each task
	const hackDuration = hackTime + hackDelay;
	const weakHackDuration = weakTime + weakHackDelay;
	const growDuration = growTime + growDelay;
	const weakGrowDuration = weakTime + weakGrowDelay;

	// Validation checks
	if (
		!(
			weakGrowDuration - growDuration === baseDelay &&
			growDuration - weakHackDuration === baseDelay &&
			weakHackDuration - hackDuration === baseDelay
		)
	) {
		throw new Error("Validation check failed");
	}

	return {
		batch: maxTime,
		hack: {
			delay: hackDelay,
			duration: hackDuration,
		},
		weakhack: {
			delay: weakHackDelay,
			duration: weakHackDuration,
		},
		grow: {
			delay: growDelay,
			duration: growDuration,
		},
		weakgrow: {
			delay: weakGrowDelay,
			duration: weakGrowDuration,
		},
	};
}
