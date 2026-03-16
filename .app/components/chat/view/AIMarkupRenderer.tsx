/* eslint react-hooks/error-boundaries: off */
import React from "react";
import { Button } from "@/components/shared/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/ui/table/Table";

// Component to render AI markup
export const AIMarkupRenderer: React.FC<{
  content: string;
  onAutofill?: (text: string) => void;
}> = ({ content, onAutofill }) => {
  // Unescape HTML entities (like &lt; to < and &gt; to >)
  const unescapedContent = content
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  // Debug logging
  console.log("=== AIMarkupRenderer Debug ===");
  console.log("Input content:", content);
  console.log("Unescaped content:", unescapedContent);
  console.log("Has table tags:", unescapedContent.includes("<table"));

  // Parse buttons: <button action="..." label="..." link="..." input="..." />
  // Handles both single and double quotes for all attributes
  const buttonRegex =
    /<button\s+action=(["'])([^"']+)\1\s+label=(["'])([^"']+)\3\s+(?:link=(["'])([^"']+)\5\s*)?(?:input=(["'])([^"']+)\7\s*)?\/>/g;

  // Parse tables: <table columns="col1,col2" rows='[[rl1,rl2],[r2c1,r2c2]]' />
  // Handles both single and double quotes, and allows any characters in rows
  const tableRegex =
    /<table\s+columns=(["'])([^"']+)\1\s+rows=(["'])([\s\S]*?)\3\s*\/>/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Find all matches for both tables and buttons, then process them in order
  const matches: {
    type: "table" | "button";
    index: number;
    match: RegExpExecArray;
  }[] = [];

  // Find all table matches
  while ((match = tableRegex.exec(unescapedContent)) !== null) {
    matches.push({ type: "table", index: match.index, match });
  }

  // Find all button matches
  while ((match = buttonRegex.exec(unescapedContent)) !== null) {
    matches.push({ type: "button", index: match.index, match });
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Process matches in order
  for (const { type, match } of matches) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${match.index}`}>
          {renderMarkdown(unescapedContent.slice(lastIndex, match.index))}
        </span>,
      );
    }

    if (type === "table") {
      try {
        const columns = match[2].split(",").map((col) => col.trim());
        let rows;

        try {
          // Try to parse the rows as JSON
          let parsedData = JSON.parse(match[4]);

          // Check if data is wrapped in {data: [...]} (readModuleData response format)
          if (
            typeof parsedData === "object" &&
            parsedData !== null &&
            "data" in parsedData
          ) {
            rows = parsedData.data;
          } else {
            rows = parsedData;
          }

          // Check that rows is an array
          if (!Array.isArray(rows)) {
            throw new Error("Rows must be an array");
          }
        } catch (jsonError) {
          // If JSON parsing fails, check if it's a completely invalid JSON string
          if (match[4].trim() === "invalid_json") {
            console.log(
              "Received invalid JSON placeholder, rendering error message",
            );
            parts.push(
              <div
                key={`error-${match.index}`}
                className="text-red-500 bg-red-50 p-2 rounded"
              >
                Error: Invalid JSON data
              </div>,
            );
            lastIndex = match.index + match[0].length;
            continue; // Skip to next match
          }

          // If JSON parsing fails, try to handle single quotes first
          console.log(
            "JSON parsing failed, attempting to replace single quotes",
          );
          let normalizedRows = match[4].replace(/'/g, '"');

          // Then try to handle unquoted strings
          normalizedRows = normalizedRows.replace(
            /([^\[\],"']+)/g,
            (matchStr) => {
              const trimmed = matchStr.trim();
              if (!trimmed) return matchStr;
              // Check if it's a number or boolean
              if (
                /^\d+(\.\d+)?$/.test(trimmed) ||
                trimmed.toLowerCase() === "true" ||
                trimmed.toLowerCase() === "false"
              ) {
                return matchStr;
              }
              // Quote it
              return `"${trimmed}"`;
            },
          );

          try {
            let parsedData = JSON.parse(normalizedRows);

            // Check if data is wrapped in {data: [...]} (readModuleData response format)
            if (
              typeof parsedData === "object" &&
              parsedData !== null &&
              "data" in parsedData
            ) {
              rows = parsedData.data;
            } else {
              rows = parsedData;
            }

            console.log("Successfully parsed with quoted strings");

            // Check that rows is an array after fallback parsing
            if (!Array.isArray(rows)) {
              throw new Error("Rows must be an array");
            }
          } catch (fallbackError) {
            console.error(
              "Failed to parse rows even with quoted strings:",
              fallbackError,
            );
            parts.push(
              <div
                key={`error-${match.index}`}
                className="text-red-500 bg-red-50 p-2 rounded"
              >
                Error: Invalid table data - could not parse JSON
              </div>,
            );
            lastIndex = match.index + match[0].length;
            continue; // Skip to next match
          }
        }

        // Validate columns against allowed fields for each module (case-insensitive)
        // Allow custom columns to be passed through
        const allowedColumns = {
          crm: ["Id", "Name", "Email", "Phone", "Status", "Type", "Created At"],
          fleet: ["Id", "Name", "Type", "Status", "Created At"],
          inventory: ["Id", "Name", "Category", "Status", "Created At"],
          hr: [
            "Id",
            "Name",
            "Email",
            "Phone",
            "Department",
            "Status",
            "Created At",
          ],
          finance: ["Id", "Number", "Status", "Amount", "Created At"],
        };

        // Determine module type from columns (case-insensitive)
        let moduleType: keyof typeof allowedColumns = "crm"; // Default
        if (columns.some((col) => col.toLowerCase().includes("category")))
          moduleType = "inventory";
        if (
          columns.some((col) => ["type", "model"].includes(col.toLowerCase()))
        )
          moduleType = "fleet";
        if (columns.some((col) => col.toLowerCase().includes("department")))
          moduleType = "hr";
        if (
          columns.some((col) =>
            ["number", "amount"].includes(col.toLowerCase()),
          )
        )
          moduleType = "finance";

        // Filter out invalid columns (case-insensitive) - allow custom columns to pass through
        const validColumns = columns.filter((col) => {
          // Check if column is in the allowed list for the current module
          const isStandardColumn = allowedColumns[moduleType].some(
            (allowedCol) => allowedCol.toLowerCase() === col.toLowerCase(),
          );
          
          // If not a standard column, consider it a custom column and allow it
          if (!isStandardColumn) {
            console.log(`Allowing custom column: ${col}`);
            return true;
          }
          
          return isStandardColumn;
        });
        const validRows = rows.map((row: any[]) => {
          return row.filter((_: any, idx: number) =>
            validColumns.includes(columns[idx]),
          );
        });

        if (validColumns.length === 0) {
          console.warn("No valid columns found for table");
          parts.push(match[0]);
          lastIndex = match.index + match[0].length;
          continue;
        }

        if (validColumns.length < columns.length) {
          console.warn(
            `Removed ${columns.length - validColumns.length} invalid columns from table`,
          );
        }

        // Render Notion-inspired table with clean, minimalist design and horizontal scroll
        parts.push(
          <div 
            key={`table-${match.index}`} 
            className="mb-4 border border-gray-200 rounded-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {validColumns
                      .filter((col) => col !== "Id")
                      .map((col, idx) => (
                        <TableHead key={idx}>
                          {col}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validRows.map((row: any[], rowIdx: number) => (
                    <TableRow key={rowIdx}>
                      {row
                        .filter(
                          (cell: any, cellIdx: number) =>
                            validColumns[cellIdx] !== "Id",
                        )
                        .map((cell: any, cellIdx: number) => (
                          <TableCell key={cellIdx}>
                            {renderCellContent(
                              validColumns.filter((col) => col !== "Id")[cellIdx],
                              cell,
                              row,
                            )}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>,
        );
      } catch (error) {
        console.error("Error parsing table:", error);
        parts.push(match[0]);
      }
    } else {
      const action = match[2];
      const label = match[4];
      const link = match[6];
      const input = match[8];

      if (input && onAutofill) {
        // Autofill button
        parts.push(
          <Button
            key={`button-${match.index}`}
            onClick={() => onAutofill(input)}
            variant="secondary"
            size="sm"
            className="mb-2 mr-2"
          >
            {label}
          </Button>,
        );
      } else if (link) {
        // Navigation button
        parts.push(
          <Button
            key={`button-${match.index}`}
            variant="outline"
            size="sm"
            className="mb-2 mr-2"
            asChild
          >
            <Link href={link} onClick={() => handleButtonClick(action)}>
              {label}
            </Link>
          </Button>,
        );
      } else {
        // Action button
        parts.push(
          <Button
            key={`button-${match.index}`}
            onClick={() => handleButtonClick(action)}
            variant="outline"
            size="sm"
            className="mb-2 mr-2"
          >
            {label}
          </Button>,
        );
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < unescapedContent.length) {
    parts.push(
      <span key="text-remaining">
        {renderMarkdown(unescapedContent.slice(lastIndex))}
      </span>,
    );
  }

  return <div className="ai-markup-renderer">{parts}</div>;
};

// Helper function to render basic markdown
const renderMarkdown = (text: string) => {
  // Handle bold (**text** or __text__)
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Handle italic (*text* or _text_)
  text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
  text = text.replace(/_(.*?)_/g, "<em>$1</em>");

  // Handle strikethrough (~~text~~)
  text = text.replace(/~~(.*?)~~/g, "<s>$1</s>");

  // Handle inline code (`code`)
  text = text.replace(
    /`(.*?)`/g,
    '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>',
  );

  return <span dangerouslySetInnerHTML={{ __html: text }} />;
};

// Helper function to render cell content with hyperlinks
const renderCellContent = (column: string, cell: any, row: any[]) => {
  // Check if this cell contains an entity name that should be hyperlinked
  const lowerCol = column.toLowerCase();
  const cellStr = String(cell || "");

  // If cell already contains HTML (like a hyperlink), render it as is
  if (cellStr.includes("<a ") || cellStr.includes("</a>")) {
    return <span dangerouslySetInnerHTML={{ __html: cellStr }} />;
  }

  if (lowerCol.includes("name") && cellStr) {
    // Find id in row - it should be numeric or in an id column
    let id = null;
    for (let i = 0; i < row.length; i++) {
      const value = row[i];
      const strValue = String(value);

      // Prioritize numeric values (more likely to be id)
      if (/^\d+$/.test(strValue)) {
        id = strValue;
        break;
      }
    }

    // If no numeric id found, check if first cell is likely id (not name or email)
    if (!id && row.length > 1) {
      const firstCell = String(row[0]);
      if (
        !firstCell.includes("@") &&
        firstCell.toLowerCase() !== cellStr.toLowerCase()
      ) {
        id = firstCell.toLowerCase().replace(/\s+/g, "-");
      }
    }

    // Determine the type of entity based on other columns in the row
    if (row.some((value) => value && String(value).includes("@"))) {
      // Probably a customer
      id = id || cellStr.toLowerCase().replace(/\s+/g, "-");
      return (
        <Link
          href={`/crm/customers/${id}`}
          className="text-blue-600 hover:underline"
        >
          {cellStr}
        </Link>
      );
    } else if (
      row.some(
        (value) =>
          value &&
          ["car", "truck", "van", "bike"].includes(String(value).toLowerCase()),
      )
    ) {
      // Probably a vehicle
      id = id || cellStr.toLowerCase().replace(/\s+/g, "-");
      return (
        <Link
          href={`/fleet/vehicles/${id}`}
          className="text-blue-600 hover:underline"
        >
          {cellStr}
        </Link>
      );
    } else if (
      row.some(
        (value) =>
          value &&
          ["electronics", "clothing", "food", "tools"].includes(
            String(value).toLowerCase(),
          ),
      )
    ) {
      // Probably a product
      id = id || cellStr.toLowerCase().replace(/\s+/g, "-");
      return (
        <Link
          href={`/inventory/products/${id}`}
          className="text-blue-600 hover:underline"
        >
          {cellStr}
        </Link>
      );
    } else if (
      row.some(
        (value) =>
          value &&
          ["engineering", "marketing", "sales", "hr"].includes(
            String(value).toLowerCase(),
          ),
      )
    ) {
      // Probably an employee
      id = id || cellStr.toLowerCase().replace(/\s+/g, "-");
      return (
        <Link
          href={`/hr/employees/${id}`}
          className="text-blue-600 hover:underline"
        >
          {cellStr}
        </Link>
      );
    } else {
      // Default entity type
      return cellStr;
    }
  }

  return cell;
};

const handleButtonClick = (action: string) => {
  console.log("Button clicked with action:", action);
  // Handle different button actions
  switch (action) {
    case "view_customer":
    case "view_vehicle":
    case "view_product":
    case "view_employee":
    case "view_invoice":
      // These actions will navigate to the respective detail pages
      // (handled by Next.js Link component)
      break;
    case "suggest":
      // Suggestion buttons are handled by autofill functionality
      break;
    default:
      console.warn(`Unhandled button action: ${action}`);
  }
};
