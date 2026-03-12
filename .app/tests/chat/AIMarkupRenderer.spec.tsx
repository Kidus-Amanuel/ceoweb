import React from "react";
import { render, screen } from "@testing-library/react";
import { AIMarkupRenderer } from "@/components/chat/view/AIMarkupRenderer";

describe("AIMarkupRenderer", () => {
  describe("Table rendering", () => {
    it("should render a table from table markup", () => {
      // Note: We don't need to escape quotes when using a function with backticks
      const content = `Here are your customers: <table columns="Name,Email,Phone,Status" rows='[["Hagos","hagos@gmail.com","0909080806","active"],["Abel","abel@example.com","0909090909","active"]]' />`;

      render(<AIMarkupRenderer content={content} />);

      // Check if table is rendered
      expect(screen.getByRole("table")).toBeInTheDocument();

      // Check if headers are rendered
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();

      // Check if table cells are rendered
      expect(screen.getByText("Hagos")).toBeInTheDocument();
      expect(screen.getByText("hagos@gmail.com")).toBeInTheDocument();
      expect(screen.getByText("0909080806")).toBeInTheDocument();
      expect(screen.getAllByText("active").length).toBeGreaterThan(0);
      expect(screen.getByText("Abel")).toBeInTheDocument();
      expect(screen.getByText("abel@example.com")).toBeInTheDocument();
      expect(screen.getByText("0909090909")).toBeInTheDocument();
    });

    it("should render hyperlinked entity names", () => {
      const content = `Here are your customers: <table columns="Id,Name,Email,Phone,Status" rows='[[1,"Hagos","hagos@gmail.com","0909080806","active"],[2,"Abel","abel@example.com","0909090909","active"]]' />`;

      render(<AIMarkupRenderer content={content} />);

      // Check if links are rendered
      const links = document.querySelectorAll("a");
      expect(links.length).toBeGreaterThan(0);

      // Check if customer names are hyperlinked
      expect(links[0]).toHaveTextContent("Hagos");
      expect(links[0]).toHaveAttribute("href", "/crm/customers/1");
      expect(links[1]).toHaveTextContent("Abel");
      expect(links[1]).toHaveAttribute("href", "/crm/customers/2");
    });

    it("should render a table with products", () => {
      const content = `Here are your products: <table columns="Name,Category,Status" rows='[["Laptop","Electronics","active"],["Mouse","Electronics","active"],["Keyboard","Electronics","inactive"]]' />`;

      render(<AIMarkupRenderer content={content} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      // Since there are multiple Electronics, use getAllByText
      expect(screen.getAllByText("Electronics").length).toBe(3);
      expect(screen.getAllByText("active").length).toBeGreaterThan(0);
    });

    it('should handle large datasets with "View all" button', () => {
      const content = `I found 25 active customers: <table columns="Name,Email,Phone,Status" rows='[["Hagos","hagos@gmail.com","0909080806","active"],["Abel","abel@example.com","0909090909","active"]]' /> <button action="suggest" label="View all customers" input="Show all customers" />`;

      render(<AIMarkupRenderer content={content} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "View all customers" }),
      ).toBeInTheDocument();
    });

    it("should handle invalid table markup gracefully", () => {
      const content = `Here are your customers: <table columns="Name,Email" rows="invalid_json" />`;

      render(<AIMarkupRenderer content={content} />);

      // Should not crash and should display error message
      expect(screen.getByText("Error: Invalid JSON data")).toBeInTheDocument();
    });
  });
});
