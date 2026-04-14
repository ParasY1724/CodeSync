import { useState, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";

const API_SUBMIT_URL = import.meta.env.VITE_API_SUBMIT_URL;

export type ExecutionStatus = "AC" | "RE" | "CE" | "TLE" | "PENDING" | null;

interface ExecutionResult {
  status: ExecutionStatus;
  output: string;
  error?: string;
}

export const useCodeRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 🔥 In-memory cache
  const cacheRef = useRef<Map<string, ExecutionResult>>(new Map());

  const generateCacheKey = (
    language: "py" | "cpp",
    sourceCode: string,
    input: string,
    expectedOutput: string
  ) => {
    return `${language}::${sourceCode}::${input}::${expectedOutput}`;
  };

  const runCode = useCallback(async (
    language: "py" | "cpp",
    sourceCode: string,
    input: string,
    expectedOutput: string
  ) => {
    if (isRunning) return;

    setIsRunning(true);
    
    const cacheKey = generateCacheKey(language, sourceCode, input, expectedOutput);
    // ✅ 1. Return cached result if exists
    if (cacheRef.current.has(cacheKey)) {
      setTimeout(() => {
        setResult(cacheRef.current.get(cacheKey)!);
        setIsRunning(false)
      }, 5000);
      return;
    }

    setResult({ status: "PENDING", output: "Sending to judge..." });

    try {
      // 2. Submit to AWS
      const response = await fetch(API_SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          sourceCode,
          input,
          expectedOutput,
          callbackUrl: ""
        })
      });

      if (!response.ok)
        throw new Error(`Submission failed: ${response.statusText}`);

      const { submissionId } = await response.json();
      setResult({ status: "PENDING", output: "Waiting for execution..." });

      if (channelRef.current)
        supabase.removeChannel(channelRef.current);

      const channel = supabase
        .channel(`submission-${submissionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'submissions',
            filter: `id=eq.${submissionId}`,
          },
          (payload) => {
            const newRow = payload.new;

            if (newRow.status !== 'PENDING') {
              const finalResult: ExecutionResult = {
                status: newRow.status,
                output: newRow.output,
              };

              // ✅ 3. Save to cache
              cacheRef.current.set(cacheKey, finalResult);

              setResult(finalResult);
              setIsRunning(false);
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

    } catch (error) {
      const errorResult: ExecutionResult = {
        status: "RE",
        output: "",
        error: error instanceof Error ? error.message : "Unknown Error"
      };

      setResult(errorResult);
      setIsRunning(false);
    }

  }, [isRunning]);

  return { isRunning, result, runCode };
};
