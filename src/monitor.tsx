import { NS } from '@ns';
import React from 'lib/react';
import { SortableTable, Column, ColumnTypes } from 'lib/monitor/SortableTable';
import { scan } from "lib/scan";

const columns: Column[] = [
    { header: 'Host', accessor: 'hostname', type: ColumnTypes.TEXT },
    { header: 'Root', accessor: 'hasAdminRights', type: ColumnTypes.BOOLEAN },
    { header: 'BDOOR', accessor: 'backdoorInstalled', type: ColumnTypes.BOOLEAN },
    { header: 'Skill', accessor: 'requiredHackingSkill', type: ColumnTypes.NUMERIC },
    { header: 'Current $', accessor: 'moneyAvailable', type: ColumnTypes.NUMERIC },
    { header: 'Max $', accessor: 'moneyMax', type: ColumnTypes.NUMERIC },
    { header: 'Growth', accessor: "serverGrowth", type: ColumnTypes.NUMERIC },
    { header: 'C', accessor: 'conCom', type: ColumnTypes.COMMAND },
    { header: 'B', accessor: 'badCom', type: ColumnTypes.COMMAND },
];

function refresh(ns: NS) {
    ns.clearLog();
    const servers = scan(ns);
    ns.printRaw(<SortableTable columns={columns} data={servers}></SortableTable>);
}

/** @param {NS} ns **/
export async function main(ns: NS) {
    ns.tail();
    ns.disableLog("ALL");
    refresh(ns);
}
