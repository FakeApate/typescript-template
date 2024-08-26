import { NS, AutocompleteData } from "@ns";
import { ArgumentSchema } from "lib/ArgumentSchema";

export function autocomplete(data: AutocompleteData, args: string[]) {
    return ArgumentSchema.Autocomplete(data, args);
}

export async function main(ns: NS): Promise<void> {
    ns.tprint(JSON.stringify(ArgumentSchema.Parse(ns)));
}