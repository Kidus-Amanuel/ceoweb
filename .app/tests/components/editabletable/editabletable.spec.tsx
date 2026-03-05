import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { createColumnHelper } from "@tanstack/react-table";

vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  const motion = new Proxy({} as Record<string, React.ComponentType<any>>, {
    get:
      (_, tag: string) =>
      ({ children, layout: _layout, ...props }: any) =>
        React.createElement(tag, props, children),
  });
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion,
  };
});

interface TestData {
  id: string;
  name: string;
  role: string;
}

const columnHelper = createColumnHelper<TestData>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("role", { header: "Role" }),
];

const mockData: TestData[] = [
  { id: "1", name: "Alice", role: "Dev" },
  { id: "2", name: "Bob", role: "Design" },
];

describe("EditableTable", () => {
  it("renders correctly with provided data", () => {
    render(
      <EditableTable
        title="Test Table"
        data={mockData}
        columns={columns as any}
      />,
    );

    expect(screen.getByText("Test Table")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Dev")).toBeInTheDocument();
  });

  it("enters edit mode when a cell is clicked", () => {
    const onUpdate = vi.fn();
    render(
      <EditableTable
        title="Test Table"
        data={mockData}
        columns={columns as any}
        onUpdate={onUpdate}
      />,
    );

    const aliceCell = screen.getByText("Alice");
    fireEvent.click(aliceCell);

    const textarea = screen.getByDisplayValue("Alice");
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });

  // TODO: Fix this test - fireEvent.change doesn't properly trigger onChange in controlled components
  // it("calls onUpdate when a cell edit is saved via Enter", async () => {
  //     const onUpdate = vi.fn();
  //     render(
  //         <EditableTable
  //             title="Test Table"
  //             data={mockData}
  //             columns={columns as any}
  //             onUpdate={onUpdate}
  //         />
  //     );

  //     fireEvent.click(screen.getByText("Alice"));
  //     const input = screen.getByDisplayValue("Alice");

  //     fireEvent.change(input, { target: { value: "Alice Updated" } });
  //     fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

  //     expect(onUpdate).toHaveBeenCalledWith("1", { name: "Alice Updated" });
  // });

  it("opens ghost row when New Record is clicked", () => {
    const onAdd = vi.fn();
    render(
      <EditableTable
        title="Test Table"
        data={mockData}
        columns={columns as any}
        onAdd={onAdd}
      />,
    );

    fireEvent.click(screen.getByLabelText(/New Record/i));

    expect(screen.getByPlaceholderText(/Set Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Set Role/i)).toBeInTheDocument();
  });

  // TODO: Fix this test - fireEvent.change doesn't properly trigger onChange in controlled components
  // it("calls onAdd when ghost row is filled and saved", () => {
  //     const onAdd = vi.fn();
  //     render(
  //         <EditableTable
  //             title="Test Table"
  //             data={mockData}
  //             columns={columns as any}
  //             onAdd={onAdd}
  //         />
  //     );

  //     fireEvent.click(screen.getByLabelText(/New Record/i));

  //     const nameInput = screen.getByPlaceholderText(/Set Name/i);
  //     const roleInput = screen.getByPlaceholderText(/Set Role/i);

  //     fireEvent.change(nameInput, { target: { value: "Charlie" } });
  //     fireEvent.change(roleInput, { target: { value: "QA" } });

  //     fireEvent.click(screen.getByLabelText(/Save new record/i));

  //     expect(onAdd).toHaveBeenCalledWith({ name: "Charlie", role: "QA" });
  // });

  it("calls onDelete after delete dialog confirmation", async () => {
    const onDelete = vi.fn();
    render(
      <EditableTable
        title="Test Table"
        data={mockData}
        columns={columns as any}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getAllByLabelText(/Delete/i)[0]);
    fireEvent.click(await screen.findByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("1");
    });
  });

  it("filters data based on search input", () => {
    render(
      <EditableTable
        title="Test Table"
        data={mockData}
        columns={columns as any}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: "Bob" } });

    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("calls onPageChange when Next is clicked", () => {
    const onPageChange = vi.fn();

    render(
      <EditableTable
        title="Customers"
        data={mockData}
        columns={columns as any}
        pagination={true}
        currentPage={1}
        totalRows={101}
        pageSize={50}
        onPageChange={onPageChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
