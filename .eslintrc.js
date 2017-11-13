module.exports = {
    "rules": {
      "no-use-before-define": [
        2,
        "nofunc"
      ],
      "space-before-function-paren": [
        2,
        "never"
      ],
      "space-in-parens": 2,
      "space-before-blocks": 2,
      "keyword-spacing": 2,
      "comma-style": 2,
      "indent": 2,
      "no-lonely-if": 2,
      "no-else-return": 0,
      "no-new": 2,
      "no-constant-condition": 0,
      "no-unused-vars": [
        2,
        {
          "args": "none"
        }
      ],
      "block-scoped-var": 2,
      "no-console": 0,
      "no-useless-escape": 0
    },
    "env": {
      "node": "true",
      "es6": "true"
    },
    "extends": ["eslint:recommended"]
}
