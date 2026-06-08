module.exports = {
  apps: [
    {
      name: "mr-video-web",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mr-video-worker",
      script: "npm",
      args: "run worker:video",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

