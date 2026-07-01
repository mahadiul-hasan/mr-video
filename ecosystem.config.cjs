module.exports = {
  apps: [
    {
      name: "vvideos-web",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "vvideos-worker",
      script: "npm",
      args: "run worker:video",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
