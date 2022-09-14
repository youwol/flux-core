
const runTimeDependencies = {
    "load": {
        "lodash": "^4.17.15",
        "rxjs": "^6.5.5",
        "@youwol/cdn-client": "^1.0.2",
        "@youwol/logging": "^0.0.2",
        "@youwol/flux-view": "^1.0.3",
        "reflect-metadata": "0.1.13"
    },
    "differed": {},
    "includedInBundle": []
}
const externals = {
    "lodash": {
        "commonjs": "lodash",
        "commonjs2": "lodash",
        "root": "__APIv4"
    },
    "rxjs": {
        "commonjs": "rxjs",
        "commonjs2": "rxjs",
        "root": "rxjs_APIv6"
    },
    "@youwol/cdn-client": {
        "commonjs": "@youwol/cdn-client",
        "commonjs2": "@youwol/cdn-client",
        "root": "@youwol/cdn-client_APIv1"
    },
    "@youwol/logging": {
        "commonjs": "@youwol/logging",
        "commonjs2": "@youwol/logging",
        "root": "@youwol/logging_APIv002"
    },
    "@youwol/flux-view": {
        "commonjs": "@youwol/flux-view",
        "commonjs2": "@youwol/flux-view",
        "root": "@youwol/flux-view_APIv1"
    },
    "reflect-metadata": {
        "commonjs": "reflect-metadata",
        "commonjs2": "reflect-metadata",
        "root": "Reflect_APIv01"
    },
    "rxjs/operators": {
        "commonjs": "rxjs/operators",
        "commonjs2": "rxjs/operators",
        "root": [
            "rxjs_APIv6",
            "operators"
        ]
    }
}
const exportedSymbols = {
    "lodash": {
        "apiKey": "4",
        "exportedSymbol": "_"
    },
    "rxjs": {
        "apiKey": "6",
        "exportedSymbol": "rxjs"
    },
    "@youwol/cdn-client": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/cdn-client"
    },
    "@youwol/logging": {
        "apiKey": "002",
        "exportedSymbol": "@youwol/logging"
    },
    "@youwol/flux-view": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/flux-view"
    },
    "reflect-metadata": {
        "apiKey": "01",
        "exportedSymbol": "Reflect"
    }
}
export const setup = {
    name:'@youwol/flux-core',
        assetId:'QHlvdXdvbC9mbHV4LWNvcmU=',
    version:'0.2.1',
    shortDescription:"Core library to create flux applications",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/flux-core',
    npmPackage:'https://www.npmjs.com/package/@youwol/flux-core',
    sourceGithub:'https://github.com/youwol/flux-core',
    userGuide:'https://l.youwol.com/doc/@youwol/flux-core',
    apiVersion:'02',
    runTimeDependencies,
    externals,
    exportedSymbols,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    }
}
