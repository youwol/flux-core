
const runTimeDependencies = {
    "externals": {
        "lodash": "^4.17.15",
        "rxjs": "^6.5.5",
        "@youwol/cdn-client": "^1.0.2",
        "@youwol/logging": "^0.0.2",
        "@youwol/flux-view": "^1.0.3",
        "reflect-metadata": "0.1.13"
    },
    "includedInBundle": {}
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

// eslint-disable-next-line @typescript-eslint/ban-types -- allow to allow no secondary entries
const mainEntry : Object = {
    "entryFile": "./index.ts",
    "loadDependencies": [
        "lodash",
        "rxjs",
        "@youwol/cdn-client",
        "@youwol/logging",
        "@youwol/flux-view",
        "reflect-metadata"
    ]
}

// eslint-disable-next-line @typescript-eslint/ban-types -- allow to allow no secondary entries
const secondaryEntries : Object = {}
const entries = {
     '@youwol/flux-core': './index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@youwol/flux-core/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@youwol/flux-core',
        assetId:'QHlvdXdvbC9mbHV4LWNvcmU=',
    version:'0.2.2',
    shortDescription:"Core library to create flux applications",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/flux-core',
    npmPackage:'https://www.npmjs.com/package/@youwol/flux-core',
    sourceGithub:'https://github.com/youwol/flux-core',
    userGuide:'https://l.youwol.com/doc/@youwol/flux-core',
    apiVersion:'02',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{cdnClient, installParameters?}) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry['loadDependencies'].map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/flux-core_APIv02`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{name: string, cdnClient, installParameters?}) => {
        const entry = secondaryEntries[name]
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@youwol/flux-core#0.2.2~dist/@youwol/flux-core/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/flux-core/${entry.name}_APIv02`]
        })
    }
}
