module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  plugins: [
    'prettier',
  ],
  extends: [
    'airbnb-base',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 1,
  },
};
