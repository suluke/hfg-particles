export type Config = {
  timestamp: string;
  git_rev: string;
  export_schema_version: number;
};

const config: Config = {
  timestamp:             '<@TIMESTAMP@>',
  git_rev:               '<@GIT_REV@>',
  export_schema_version: 0
};

export default config;
