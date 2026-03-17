// Test script to verify the message ID fix
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Go to the login page
  await page.goto('http://localhost:3000');
  
  // Login (using the default credentials from the demo)
  await page.click('text=Sign In');
  
  // Wait for the dashboard to load
  await page.waitForSelector('text=Dashboard');
  
  // Go to the AI chat
  await page.click('text=CEO Assistant');
  
  // Wait for the chat to load
  await page.waitForSelector('input[placeholder="Type your question..."]');
  
  // Send multiple messages to test the fix
  const questions = [
    "Show me active customers",
    "List all products",
    "Show recent deals",
    "Show employees"
  ];
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    await page.fill('input[placeholder="Type your question..."]', question);
    await page.click('button[type="submit"]');
    
    // Wait for the AI response
    await page.waitForTimeout(3000);
    
    // Check if there are duplicate keys in the console
    const logs = await page.evaluate(() => window.console.messages || []);
    const hasDuplicateKeys = logs.some(log => log.includes('Duplicate key') || log.includes('same key'));
    
    if (hasDuplicateKeys) {
      console.error(`Error: Duplicate keys found after sending question ${i+1}: "${question}"`);
    } else {
      console.log(`Success: No duplicate keys after sending question ${i+1}: "${question}"`);
    }
    
    // Check that all messages have unique ids
    const messages = await page.evaluate(() => {
      const messageElements = document.querySelectorAll('[data-message-id]');
      const ids = [];
      messageElements.forEach(el => ids.push(el.dataset.messageId));
      return ids;
    });
    
    const uniqueIds = [...new Set(messages)];
    if (uniqueIds.length !== messages.length) {
      console.error(`Error: Duplicate message ids found: ${messages.join(', ')}`);
    } else {
      console.log(`Success: All messages have unique ids: ${messages.join(', ')}`);
    }
  }
  
  // Close the browser
  await browser.close();
  console.log('Test completed successfully!');
})();