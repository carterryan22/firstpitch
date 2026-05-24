/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  transpilePackages: ["@platform/compiler", "@platform/corpus", "@platform/safety", "@platform/ai", "@platform/diagnosis", "@platform/ingest", "@platform/missions", "@platform/eval", "@platform/storage", "@platform/auth"],
};

export default nextConfig;
