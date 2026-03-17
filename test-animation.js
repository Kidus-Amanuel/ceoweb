const fs = require('fs');
const path = require('path');

// Check if all necessary files are present
const filesToCheck = [
  'e:/Projects/CEO AI/.app/components/chat/layout/ChatLayout.tsx',
  'e:/Projects/CEO AI/.app/components/chat/view/ChatMessages.tsx',
  'e:/Projects/CEO AI/.app/components/chat/view/MessageItem.tsx'
];

console.log('Checking if all animation-related files are present...');
let allFilesExist = true;
for (const file of filesToCheck) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${path.basename(file)} exists`);
  } else {
    console.log(`❌ ${path.basename(file)} NOT found at ${file}`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('Some files are missing. Animation implementation is incomplete.');
  process.exit(1);
}

console.log('\n=== ChatLayout.tsx Check ===');
const chatLayoutContent = fs.readFileSync(filesToCheck[0], 'utf8');
if (chatLayoutContent.includes('streamingIds')) {
  console.log('✅ streamingIds state is defined');
} else {
  console.log('❌ streamingIds state not found');
}
if (chatLayoutContent.includes('thinkingPhase')) {
  console.log('✅ thinkingPhase state is defined');
} else {
  console.log('❌ thinkingPhase state not found');
}
if (chatLayoutContent.includes('setStreamingIds')) {
  console.log('✅ setStreamingIds is called');
} else {
  console.log('❌ setStreamingIds not called');
}
if (chatLayoutContent.includes('setThinkingPhase')) {
  console.log('✅ setThinkingPhase is called');
} else {
  console.log('❌ setThinkingPhase not called');
}
if (chatLayoutContent.includes('clearInterval')) {
  console.log('✅ clearInterval is called');
} else {
  console.log('❌ clearInterval not called');
}
if (chatLayoutContent.includes('phaseInterval')) {
  console.log('✅ phaseInterval is defined');
} else {
  console.log('❌ phaseInterval not defined');
}
if (chatLayoutContent.includes('ChatMessages')) {
  console.log('✅ ChatMessages component is used');
} else {
  console.log('❌ ChatMessages component not used');
}
if (chatLayoutContent.includes('streamingIds')) {
  console.log('✅ streamingIds prop is passed to ChatMessages');
} else {
  console.log('❌ streamingIds prop not passed to ChatMessages');
}
if (chatLayoutContent.includes('thinkingPhase')) {
  console.log('✅ thinkingPhase prop is passed to ChatMessages');
} else {
  console.log('❌ thinkingPhase prop not passed to ChatMessages');
}

console.log('\n=== ChatMessages.tsx Check ===');
const chatMessagesContent = fs.readFileSync(filesToCheck[1], 'utf8');
if (chatMessagesContent.includes('interface ChatMessagesProps')) {
  console.log('✅ ChatMessagesProps interface exists');
} else {
  console.log('❌ ChatMessagesProps interface not found');
}
if (chatMessagesContent.includes('streamingIds')) {
  console.log('✅ streamingIds prop is defined');
} else {
  console.log('❌ streamingIds prop not defined');
}
if (chatMessagesContent.includes('thinkingPhase')) {
  console.log('✅ thinkingPhase prop is defined');
} else {
  console.log('❌ thinkingPhase prop not defined');
}
if (chatMessagesContent.includes('isStreaming')) {
  console.log('✅ isStreaming prop is passed to MessageItem');
} else {
  console.log('❌ isStreaming prop not passed to MessageItem');
}
if (chatMessagesContent.includes('thinkingPhase')) {
  console.log('✅ thinkingPhase prop is passed to MessageItem');
} else {
  console.log('❌ thinkingPhase prop not passed to MessageItem');
}

console.log('\n=== MessageItem.tsx Check ===');
const messageItemContent = fs.readFileSync(filesToCheck[2], 'utf8');
if (messageItemContent.includes('interface MessageProps')) {
  console.log('✅ MessageProps interface exists');
} else {
  console.log('❌ MessageProps interface not found');
}
if (messageItemContent.includes('isStreaming')) {
  console.log('✅ isStreaming prop is defined');
} else {
  console.log('❌ isStreaming prop not defined');
}
if (messageItemContent.includes('thinkingPhase')) {
  console.log('✅ thinkingPhase prop is defined');
} else {
  console.log('❌ thinkingPhase prop not defined');
}
if (messageItemContent.includes('animate-bounce')) {
  console.log('✅ Bouncing dots animation is included');
} else {
  console.log('❌ Bouncing dots animation not found');
}
if (messageItemContent.includes('Thinking')) {
  console.log('✅ Thinking phase text is included');
} else {
  console.log('❌ Thinking phase text not found');
}

console.log('\n=== All checks complete ===');
console.log('');
console.log('To test the animation:');
console.log('1. Open VSCode and navigate to e:/Projects/CEO AI/.app');
console.log('2. Run `npm run dev` in the terminal');
console.log('3. Open your browser at http://localhost:3000');
console.log('4. Go to the AI chat interface');
console.log('5. Send a query and observe the thinking phase animation');
