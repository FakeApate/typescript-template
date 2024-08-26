import { NS } from "@ns";
import { parseArguments } from "lib/batch/shared/util";

export async function main(ns: NS): Promise<void> {
    const [hostname, delay, threads] = parseArguments(ns);
    ns.setTitle("Hack Job");
    await ns.hack(hostname, {
        additionalMsec: delay,
        threads: threads,
        stock: false
    });
}