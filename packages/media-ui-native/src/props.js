const handlers = new WeakMap();

// Cache composed handlers so FlatList's viewability callback stays stable.
function compose(internal, consumer) {
  let consumers = handlers.get(internal);
  if (!consumers) { consumers = new WeakMap(); handlers.set(internal, consumers); }
  if (!consumers.has(consumer)) {
    consumers.set(consumer, (...args) => {
      consumer(...args);
      if (!args[0]?.defaultPrevented) return internal(...args);
    });
  }
  return consumers.get(consumer);
}

export function mergeProps(base, supplied = {}) {
  const result = { ...base };
  for (const [key, value] of Object.entries(supplied)) {
    if (value === undefined) continue;
    result[key] = /^on[A-Z]/.test(key) && typeof base[key] === "function" && typeof value === "function"
      ? compose(base[key], value) : value;
  }
  if (base.accessibilityState || supplied.accessibilityState) {
    result.accessibilityState = { ...base.accessibilityState, ...supplied.accessibilityState };
  }
  return result;
}

export function assignRef(ref, value) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export const itemKey = (item, index) => String(item?.id ?? item?.key ?? index);
