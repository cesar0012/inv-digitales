interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DASHBOARD_URL: string;
  readonly VITE_DEV_MODE: string;
  readonly VITE_PUBLIC_URL: string;
  readonly VITE_OPENAI_BASE_URL: string;
  readonly VITE_OPENAI_MODEL: string;
  readonly VITE_OPENAI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
