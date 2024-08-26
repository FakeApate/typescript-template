import { NS } from "@ns";
import { parseArguments } from "lib/batch/shared/util";

export async function main(ns: NS): Promise<void> {
    const [hostname, delay, threads] = parseArguments(ns);
    ns.setTitle("Weaken Job");
    await ns.weaken(hostname, {
        additionalMsec: delay,
        threads: threads,
        stock: false
    });
}