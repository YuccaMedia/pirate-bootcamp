/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    setupFiles: ['<rootDir>/src/tests/setup.ts'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/quest-1/',
        '/quest-2/',
        '/quest-3/',
        '/quest-4/',
        '/quest-5/',
        '/quest-6/',
        '/quest-7/',
        '/faucet/'
    ]
}; 