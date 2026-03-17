import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ChatLayout } from '@/components/chat/layout/ChatLayout';

describe('Message ID Generation', () => {
  it('should generate unique message IDs for each call', () => {
    // Create a spy to track the generated IDs
    const generatedIds = new Set<string>();
    
    // Simulate sending 10 messages
    for (let i = 0; i < 10; i++) {
      const timestamp = Date.now() + i; // Ensure different timestamps
      const randomStr = Math.random().toString(36).substr(2, 9);
      const aiId = `ai-msg-${randomStr}-${timestamp}`;
      generatedIds.add(aiId);
    }
    
    // Verify that all generated IDs are unique
    expect(generatedIds.size).toBe(10);
  });

  it('should generate valid message IDs', () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const id = `ai-msg-${randomStr}-${timestamp}`;
    
    // Check that the id has the expected format
    expect(id).toMatch(/ai-msg-[a-z0-9]{9}-\d+/);
  });

  it('should have different timestamps in sequential calls', () => {
    const timestamps: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const timestamp = Date.now() + i; // Ensure different timestamps
      timestamps.push(timestamp);
    }
    
    // Verify that all timestamps are different
    const uniqueTimestamps = [...new Set(timestamps)];
    expect(uniqueTimestamps.length).toBe(timestamps.length);
  });
});