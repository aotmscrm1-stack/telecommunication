const pluginSecurity = require('eslint-plugin-security');

module.exports = [
  pluginSecurity.configs.recommended,
  {
    rules: {
      'security/detect-object-injection': 'off', // Turn off false positives for dynamic object property assignments in Express
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'warn',
    },
  },
];
