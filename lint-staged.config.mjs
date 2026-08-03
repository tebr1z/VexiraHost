export default {
  "*.{ts,tsx,js,jsx}": ["eslint --fix --no-cache", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"],
};
