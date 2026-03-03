import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { describe, it, expect, vi } from "vitest";
import { createColumnHelper } from "@tanstack/react-table";

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

    const input = screen.getByDisplayValue("Alice");
    expect(input.tagName.toLowerCase()).toBe("input");
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

  it("calls onDelete after delete dialog confirmation", () => {
    const onDelete = vi.fn();
    render(
      <EditableTable
        title="Test Table"
        data={mockData}
        columns={columns as any}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Delete 1/i));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("filters data based on search input", async () => {
    render(
      <EditableTable
        title="Test Table"
        data={mockData}
        columns={columns as any}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: "Bob" } });

    await waitFor(
      () => {
        const alice = screen.queryByText("Alice");
        expect(alice).toBeNull();
      },
      { timeout: 2000 },
    );

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
