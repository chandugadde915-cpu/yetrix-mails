"use client";

import { ReactNode, useMemo, useState } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  searchText?: (row: T) => string;
}

export function DataTable<T>({
  rows,
  columns,
  empty,
  actions,
  getRowKey,
}: {
  rows: T[];
  columns: Array<DataTableColumn<T>>;
  empty: ReactNode;
  actions?: ReactNode;
  getRowKey: (row: T) => string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      columns.some((column) =>
        (column.searchText?.(row) ?? String(column.render(row))).toLowerCase().includes(needle),
      ),
    );
  }, [columns, query, rows]);

  return (
    <section className="panel section">
      <div className="list-toolbar">
        <input
          aria-label="Search table"
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
      {filtered.length === 0 ? (
        empty
      ) : (
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
