/**
 * ## flux-project
 *
 * A project in flux is a the description of an application:
 * -    modules/plugins
 * -    connections
 * -    layers tree
 * -    builder views of the modules (mostly position)
 * -    HTML layout
 * -    css stylesheets
 * -    project requirements
 *
 * This module includes:
 * -    The [schemas](./lib_flux_project_client_schemas.html): they declare the required interface of
 * the different entities listed above. The top level schema is [[ProjectSchema]].
 * -    The [loaders](./lib_flux_project_loaders.html): they map the schemas to actual instances.
 * Some of the models are presented in [[core-concepts]] and others [here](lib_flux_project_core_models.html) in this module.
 *
 * The bundles of the different flux-packs used in a project needs to be fetched during its instantiation.
 *  That's why some of the loading functions required an [[IEnvironment]] parameters.
 * Two environments exists:
 * -    [[Environment]]: this is the environment corresponding to the YouWol ecosystem, the one used in Flux
 * applications
 * -    [[MockEnvironment]]: a (minimal) mock environment for unit-testing
 *
 * You can also create your own 'resource management' environment by inheriting a class from [[IEnvironment]].
 *
 * @format
 * @module flux-project
 */

export * from './client-schemas'
export * from './core-models'
export * from './loaders'
