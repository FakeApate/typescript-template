import { NS } from "@ns";

let ns: NS;
let attacks: ((host: string) => void)[];

function init(n: NS) {
  ns = n;
  attacks = [
    ns.brutessh,
    ns.ftpcrack,
    ns.relaysmtp,
    ns.sqlinject,
    ns.httpworm,
    ns.nuke,
  ];
}

function scan(ns: NS, server: string, parent?: string) {
  const result = ns.scan(server);
  for (const item of result) {
    if (item != parent) {
      scan(ns, item, server);
    } else {
      for (const attack of attacks) {
        try {
          attack(server);
        } catch {
          //Ignore
        }
      }
    }
  }
}

export async function main(n: NS) {
  init(n);
  scan(ns, "home");
}
