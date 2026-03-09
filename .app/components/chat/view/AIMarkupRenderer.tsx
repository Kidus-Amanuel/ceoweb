/* eslint react-hooks/error-boundaries: off */
import React from "react";
import { Button } from "@/components/shared/ui/button";
import Link from "next/link";

// Component to render AI markup
export const AIMarkupRenderer: React.FC<{
  content: string;
  onAutofill?: (text: string) => void;
}> = ({ content, onAutofill }) => {
  // Parse buttons: <button action="..." label="..." link="..." input="..." />
  const buttonRegex =
    /<button\s+action="([^"]+)"\s+label="([^"]+)"\s+(?:link="([^"]+)"\s*)?(?:input="([^"]+)"\s*)?\/>/g;

  // Parse tables: <table columns="col1,col2" rows="[[rl1,rl2],[r2c1,r2c2]]" />
  const tableRegex = /<table\s+columns="([^"]+)"\s+rows="([^"]+)"\s*\/>/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Find and replace buttons
  while ((match = buttonRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const action = match[1];
    const label = match[2];
    const link = match[3];
    const input = match[4];

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

    lastIndex = match.index + match[0].length;
  }

  // Find and replace tables
  while ((match = tableRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    try {
      const columns = match[1].split(",").map((col) => col.trim());
      const rows = JSON.parse(match[2]);

      parts.push(
        <div key={`table-${match.index}`} className="mb-4 overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row: any[], rowIdx: number) => (
                    <tr
                      key={rowIdx}
                      className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-6 py-4 text-sm text-gray-900"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>,
      );
    } catch (error) {
      console.error("Error parsing table:", error);
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <div className="ai-markup-renderer">{parts}</div>;
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
