import { NS, Server } from "@ns";

export class ScanEntry implements Server {
    hostname!: string;
    route: string[] = [];
    depth!: number;
    ip!: string;
    sshPortOpen = false;
    ftpPortOpen = false;
    smtpPortOpen = false;
    httpPortOpen = false;
    sqlPortOpen = false;
    hasAdminRights = false;
    cpuCores!: number;
    isConnectedTo = false;
    ramUsed!: number;
    maxRam!: number;
    organizationName!: string;
    purchasedByPlayer = false;
    backdoorInstalled?: boolean | undefined;
    baseDifficulty?: number | undefined;
    hackDifficulty?: number | undefined;
    minDifficulty?: number | undefined;
    moneyAvailable?: number | undefined;
    moneyMax?: number | undefined;
    numOpenPortsRequired?: number | undefined;
    openPortCount?: number | undefined;
    requiredHackingSkill?: number | undefined;
    serverGrowth?: number | undefined;
    conCom = "";
    badCom = "";
}

export function scan(ns: NS, self: ScanEntry = {...ns.getServer("home"), depth: 0, route: [], conCom: "", badCom: ""}, parent: ScanEntry | undefined = undefined, depth = 0): ScanEntry[] {
    const servers: ScanEntry[] = [];
    const neighbors = ns.scan(self.hostname);
    neighbors.forEach((neighbor) => {
        if (((parent && neighbor !== parent.hostname) || !parent) && neighbor !== "darkweb") {
            const new_self: ScanEntry = {
                ...ns.getServer(neighbor),
                depth: depth,
                route: self.route.concat([self.hostname]),
                conCom: "co" + "nnect " + self.route.concat([self.hostname]).join("; co" + "nnect ") + "; co" + `nnect ${neighbor}`,
                badCom: "co" + "nnect " + self.route.concat([self.hostname]).join("; c" + "onnect ") + "; co" + `nnect ${neighbor}; backdoor`,
            };
            if (!new_self.purchasedByPlayer) {
                servers.push(new_self, ...scan(ns, new_self, self, depth + 1));
            }
        }
    });
    return servers;
}
