import { NS, ScriptArg, AutocompleteData } from "@ns";

export class ArgumentSchema {
    static Arguments: [string, string[]][] = [
        ["crime", []],
        ["workType", []],
        ["city", []],
        ["bodyAttribute", []],
        ["fields", []],
        ["classes", []],
        ["company", []],
        ["job", []],
        ["server", []],
        ["script", []],
        ["textFile", []]
    ];

    public static Parse(ns: NS): {
        [key: string]: ScriptArg | string[];
    } {
        const all_flags = ns.flags(ArgumentSchema.Arguments);
        const keyword_flags = Object.entries(all_flags)
            .filter((v) => v[0] !== "_" && (v[1] instanceof Array && v[1].length > 0))
            .map((v) => {
                if (typeof v[1] === "string") {
                    return [v[0], decodeURIComponent(v[1])];
                }
                if (v[1] instanceof Array) {
                    return [v[0], v[1].map((k) => decodeURIComponent(k))];
                }
                return v;
            });
        return Object.fromEntries(keyword_flags);
    }

    private static AutoCompletion(command: string, data: AutocompleteData): string[] {
        switch (command) {
            case "--server":
                return data.servers.map((v: string) => encodeURIComponent(v));
            case "--script":
                return data.scripts.map((v: string) => encodeURIComponent(v));
            case "--textFile":
                return data.txts.map((v: string) => encodeURIComponent(v));
            case "--crime":
                return Object.values(data.enums.CrimeType).map((v) => encodeURIComponent(v as string));
            case "--workType":
                return Object.values(data.enums.FactionWorkType).map((v) => encodeURIComponent(v as string));
            case "--city":
                return Object.values(data.enums.CityName).map((v) => encodeURIComponent(v as string));
            case "--bodyAttribute":
                return Object.values(data.enums.GymType).map((v) => encodeURIComponent(v as string));
            case "--fields":
                return Object.values(data.enums.JobField).map((v) => encodeURIComponent(v as string));
            case "--classes":
                return Object.values(data.enums.UniversityClassType).map((v) => encodeURIComponent(v as string));
            case "--company":
                return Object.values(data.enums.CompanyName).map((v) => encodeURIComponent(v as string));
            case "--job":
                return Object.values(data.enums.JobName).map((v) => encodeURIComponent(v as string));
            default:
                return [];
        }
    }

    public static Autocomplete(data: AutocompleteData, args: string[]) {
        let completed: string[] = [];
    
        if (args.length == 1) {
            completed = ArgumentSchema.AutoCompletion(args[0], data);
        }
    
        if (args.length >= 2) {
            completed = ArgumentSchema.AutoCompletion(args[args.length - 2], data);
            
            if (completed.length == 0) {
                completed = ArgumentSchema.AutoCompletion(args[args.length - 1], data);
            }
            else {
                if (completed.length > 0 && completed.findIndex((v) => v === args[args.length - 1]) !== -1) {
                    completed = [];
                }
            }
        }
    
        if (completed.length === 0) {
            data.flags(ArgumentSchema.Arguments);
        }
        return completed;
    }
}
