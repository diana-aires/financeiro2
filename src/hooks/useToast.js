import { useState, useCallback } from 'react';

export function useToast() {
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");

  const toast = useCallback((message, type = "success") => {
    setToastMsg(message);
    setToastType(type);
    setTimeout(() => {
      setToastMsg("");
      setToastType("success");
    }, 3000);
  }, []);

  return { toastMsg, toastType, toast };
}
