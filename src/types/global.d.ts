interface Window {
  __store: any; // We'll type this fully when AppState is extracted
  __settingsStore: any;
  __term_for_test: any;
  __term_id_for_test: string;
  __invoke_write: (data: string) => Promise<void>;
}
