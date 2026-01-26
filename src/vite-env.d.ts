declare module "*.wasm" {
  const content: string;
  export default content;
}

declare module "*?raw" {
  const content: string;
  export default content;
}

// Add custom property for navigator.userAgentData if needed,
// though 'mobile' check might need a specific interface extension.
interface Navigator {
  userAgentData?: {
    getHighEntropyValues: (
      hints: string[],
    ) => Promise<{ mobile: boolean; [key: string]: any }>;
  };
}
