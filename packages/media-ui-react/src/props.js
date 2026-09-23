// Consumer handlers run first and can cancel internal behavior with preventDefault.
export function mergeProps(base, supplied = {}) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(supplied)) {
    if (value !== undefined) merged[key] = value;
  }
  for (const key of Object.keys(base)) {
    if (/^on[A-Z]/.test(key) && typeof base[key] === "function" && supplied[key]) {
      merged[key] = (...args) => {
        supplied[key](...args);
        if (!args[0]?.defaultPrevented) return base[key](...args);
      };
    }
  }
  return merged;
}

export function assignRef(ref, value) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}
