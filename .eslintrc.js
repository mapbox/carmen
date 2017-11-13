module.exports = {
    'rules': {
        'block-scoped-var': 2,
        'comma-dangle': [2, 'only-multiline'],
        'comma-style': 2,
        'keyword-spacing': 2,
        'indent': 2,
        'no-console': 0,
        'no-constant-condition': 0,
        'no-else-return': 0,
        'no-extra-parens': [2, 'functions'],
        'no-lonely-if': 2,
        'no-new': 2,
        'no-proto': 2,
        'no-unused-vars': [2,{'args': 'none'}],
        'no-use-before-define': [2,'nofunc'],
        'no-useless-escape': 0,
        'space-before-blocks': 2,
        'space-before-function-paren': [2, 'never'],
        'space-in-parens': 2
    },
    'env': {
        'node': 'true',
        'es6': 'true'
    },
    'extends': ['eslint:recommended']
}
