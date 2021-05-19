
export let mockProjectsDB={

    emptyProject :{
        requirements:{
            fluxPacks:[],
            libraries:{},
            loadingGraph:{ 
                definition:[], 
                lock:[],
                graphType:"sequential-v1"
            }
        },
        description:"",
        name:"emptyProject",
        workflow: {
            modules:[],
            connections:[],
            plugins:[],
            rootLayerTree:{
                layerId:"",
                title:"",
                children:[],
                moduleIds:[],
                inputSlots:[],
                outputSlots:[]
            }
        },
        builderRendering:{
            connectionsView:[], 
            modulesView:[],
            descriptionsBoxes:[]
        },
        runnerRendering :{
            style:"",
            layout:""
        }
    },
    simpleProject :{
        requirements:{
            fluxPacks:["flux-test"],
            libraries:{"flux-test":"0.0.0"},
            loadingGraph:{ 
                definition:[
                    [["assetId_flux-test", "cdn/libraries/flux-test/0.0.0/bundle.js"]]
                ], 
                lock:[
                    { id:"assetId_flux-test", name:"flux-test", version:"0.0.0" }
                ],
                graphType:"sequential-v1"
            }
        },
        description:"",
        name:"simpleProject",
        workflow: {
            modules:[
                {
                    moduleId:"module0",
                    factoryId:{module:"ModuleTest", pack:"flux-test"},
                    configuration: {
                        title: "saved title 0",
                        description: "",
                        data: {
                          property0: 1
                        }
                      },
                },
                {
                    moduleId:"module1",
                    factoryId:{module:"ModuleTest", pack:"flux-test"},
                    configuration: {
                        title: "saved title 1",
                        description: "",
                        data: {
                          property0: 2
                        }
                      },
                },
                {
                    moduleId:"GroupModules_child-layer",
                    factoryId:{module:"GroupModules", pack:"@youwol/flux-core"},
                    configuration: {
                        title: "group",
                        description: "",
                        data: {
                            explicitInputsCount:0,
                            explicitOutputsCount:0,
                            environment:""}
                      },
                }
            ],
            connections:[{
                end: {
                  slotId: "input",
                  moduleId: "module0"
                },
                start: {
                  slotId: "output",
                  moduleId: "module1"
                }
            },{
                end: {
                  slotId: "input",
                  moduleId: "plugin0"
                },
                start: {
                  slotId: "output",
                  moduleId: "module1"
                }
            }],
            plugins:[{
                moduleId:"plugin0",
                parentModuleId:"module0",
                factoryId:{module:"PluginTest", pack:"flux-test"}, 
                configuration: {
                    title: "plugin0 title ",
                    description: "",
                    data: {
                      property0: 0
                    }
                  },
            }],
            rootLayerTree:{
                layerId:"root layer",
                title:"",
                children:[{
                    layerId:"child-layer",
                    title:"",
                    children:[],
                    moduleIds:["module1","plugin0"]
                }],
                moduleIds:["module0"]
            }
        },
        builderRendering:{       
            connectionsView:[],     
            modulesView:[{
                moduleId: "module0",
                xWorld:0,
                yWorld:0
            },
            {
                moduleId: "module1",
                xWorld:10,
                yWorld:0
            },
            {
                moduleId: "GroupModules_child-layer",
                xWorld:10,
                yWorld:0
            }],
            descriptionsBoxes:[{
                descriptionBoxId:"descriptionBoxId",
                title: "descriptionBoxTitle",
                modulesId: ["module0"],
                descriptionHtml: "",
                properties: {color:"blue"}
            }]
        },
        runnerRendering :{
            style:"",
            layout:""
        }
    }
}