import type { ReactNode } from "react";

/** A header row, then one row per entry: the sample Claymoo screens. */
export function Table({ head, rows, className }: { head: string[]; rows: ReactNode[][]; className?: string }) {
  return (
    <table className={className}>
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
