import { useState } from "react"
import { toast } from "sonner";

function useFetch<T = any, Args extends any[] = any[]>(
  cb: (...args: Args) => Promise<T>
) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fn = async (...args: Args) => {
    setLoading(true);
    setError(null)

    try {
      const response = await cb(...args);
      setData(response)
      setError(null)

      console.log("Returned from fn:", response); // dentro da função que executa
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, fn, setData }
};

export default useFetch