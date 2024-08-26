/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'lib/react';
import { formatNumber, formatBoolean, formatRam, formatTime } from 'lib/formatter/index';

export enum ColumnTypes {
    TEXT,
    NUMERIC,
    BOOLEAN,
    RAM,
    COMMAND,
    TIME
}

const FORMAT_TYPE_MAP: {
    [K in ColumnTypes]: ((v: any) => string) | ((v: any) => React.JSX.Element)
} = {
    [ColumnTypes.BOOLEAN]: (b: boolean) => formatBoolean(b),
    [ColumnTypes.COMMAND]: (s: string) => <button onClick={function (_event) { runTerminalCommand(s); }}>X</button>,
    [ColumnTypes.NUMERIC]: (n: number) => formatNumber(n),
    [ColumnTypes.RAM]: (n: number) => formatRam(n),
    [ColumnTypes.TEXT]: (s: string) => s,
    [ColumnTypes.TIME]: (n: number) => formatTime(n)
};
export interface Column {
    header: string;
    accessor: string;
    type?: ColumnTypes;
}

interface SortableTableProps {
    columns: Column[];
    data: any[];
}

interface SortConfig {
    key: string;
    direction: 'ascending' | 'descending';
}

function format(type: ColumnTypes | undefined, value: any) {
    if (typeof type !== "number") return "";
    const formatter = FORMAT_TYPE_MAP[type];
    const result = formatter(value)
    return result;
}

/**
 * runTerminalCommand: Runs the given string in the terminal.
 *
 * @param   {string}   command  A string with the terminal command(s) to run.
 * @returns {Promise}           Returns a Promise object.
 **/
async function runTerminalCommand(command: string) {  // deepscan-ignore-line
    const terminalInput = eval("do" + "cum" + "ent" + ".getElementById(\"terminal-input\")"), terminalEventHandlerKey = Object.keys(terminalInput)[1];
    terminalInput.value = command;
    terminalInput[terminalEventHandlerKey].onChange({ target: terminalInput });
    setTimeout(function (_event: unknown) {
        terminalInput.focus();
        terminalInput[terminalEventHandlerKey].onKeyDown({ key: 'Enter', preventDefault: () => 0 });
    }, 0);
}


export function SortableTable({ columns, data }: SortableTableProps) {
    // State to manage sorting, defaulting to the first column if available
    const [sortConfig, setSortConfig] = React.useState<SortConfig>({
        key: columns.length > 0 ? columns[3].accessor : '',
        direction: 'ascending',
    });

    // Function to handle sorting when a header is clicked
    const handleSort = (key: string) => {
        let direction: 'descending' | 'ascending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Function to sort data based on the sortConfig
    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return data;
        return [...data].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    return (
        <div id="custom-monitor" style={{ fontSize: '0.75rem' }}>
            <style children={`
                #custom-monitor th,
                #custom-monitor td {
                    padding-right: 12px;
                }
                #custom-monitor th {
                    text-align: left;
                    cursor: pointer;
                }
                #custom-monitor thead > * {
                    border-bottom: 1px solid green;
                }
                #custom-monitor tr:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `} />
            <table style={{ borderSpacing: 0, whiteSpace: 'pre' }}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.accessor} onClick={() => handleSort(column.accessor)}>
                                {column.header}
                                {sortConfig.key === column.accessor && (
                                    <span>
                                        {sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr key={index}>
                            {columns.map((column) => (
                                <td key={column.accessor}>
                                    {format(column.type, row[column.accessor])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}