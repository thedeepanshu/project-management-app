import { GitHubIcon, GoogleIcon, MicrosoftIcon } from "./ProviderIcons";

/** Social sign-in providers the UI knows how to show (the server decides which are enabled). */
export const PROVIDERS = {
  google: { label: "Google", Icon: GoogleIcon },
  github: { label: "GitHub", Icon: GitHubIcon },
  microsoft: { label: "Microsoft", Icon: MicrosoftIcon },
};
