import { useEffect, useState } from "react";

import { getAppConfig } from "../lib/api";

const OFF = { uploads: { enabled: false } };

/** Server feature flags. Features stay hidden until the config says they're on. */
export function useAppConfig() {
  const [config, setConfig] = useState(OFF);
  useEffect(() => {
    let active = true;
    getAppConfig().then((value) => active && setConfig(value));
    return () => {
      active = false;
    };
  }, []);
  return config;
}
