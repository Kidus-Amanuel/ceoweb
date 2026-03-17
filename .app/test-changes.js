console.log("Checking if changes are valid...");

// Check if package.json exists
const fs = require("fs");
if (fs.existsSync(".app/package.json")) {
  console.log("✅ package.json exists");
} else {
  console.log("❌ package.json not found");
  process.exit(1);
}

// Check if chat components exist
if (fs.existsSync(".app/components/ai-agent/ChatWindow.tsx")) {
  console.log("✅ ChatWindow.tsx exists");
} else {
  console.log("❌ ChatWindow.tsx not found");
  process.exit(1);
}

if (fs.existsSync(".app/components/chat/view/MessageItem.tsx")) {
  console.log("✅ MessageItem.tsx exists");
} else {
  console.log("❌ MessageItem.tsx not found");
  process.exit(1);
}

// Check if route.ts exists
if (fs.existsSync(".app/app/api/ai/agent/route.ts")) {
  console.log("✅ route.ts exists");
} else {
  console.log("❌ route.ts not found");
  process.exit(1);
}

console.log("✅ All required files found");
console.log("");
console.log("To test the changes, please:");
console.log("1. Open the .app folder in VSCode");
console.log("2. Run `npm install` to install dependencies");
console.log("3. Run `npm run dev` to start the development server");
console.log("4. Open your browser and navigate to http://localhost:3000");
console.log(
  "5. Test the AI chat interface with Amharic queries and observe the thinking phase animation",
);
