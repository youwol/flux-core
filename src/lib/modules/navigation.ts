/** @format */

import { logFactory } from "@youwol/logging";
import { Workflow } from "../flux-project";
import { ModuleFlux, PluginFlux } from "../models";
import { Component } from "./component.module";
import { GroupModules } from "./group.module";

const log = logFactory().getChildLogger("@youwol/flux-core/Modules/Navigation");

export type PredicateModule<T extends ModuleFlux> = (mdle: T) => boolean;
export type PluginParentingPolicy = "module" | "group";

const predicateModuleId: (moduleId: string) => PredicateModule<ModuleFlux> =
  (moduleId) => (mdle) =>
    mdle.moduleId === moduleId;

export interface WorkflowNavigation {
  fromRoot(): ModuleNavigation<Component.Module>;

  from(moduleId: string): ModuleNavigation<ModuleFlux>;

  fromComponent(moduleId: string): ModuleNavigation<Component.Module>;

  fromGroup(moduleId: string): ModuleNavigation<GroupModules.Module>;

  fromMatching(
    predicate: PredicateModule<ModuleFlux>
  ): ModuleNavigation<ModuleFlux>;

  fromGroupMatching(
    predicate: PredicateModule<GroupModules.Module>
  ): ModuleNavigation<GroupModules.Module>;

  fromComponentMatching(
    predicate: PredicateModule<Component.Module>
  ): ModuleNavigation<Component.Module>;
}

export interface ModuleNavigation<T extends ModuleFlux> {
  toChildren(): ModuleNavigation<ModuleFlux>[];

  toParent(): ModuleNavigation<GroupModules.Module>;

  toParentComponent(): ModuleNavigation<Component.Module>;

  toAncestorMatching(
    predicate: PredicateModule<GroupModules.Module>
  ): ModuleNavigation<ModuleFlux>;

  get(): T;

  ifNoMatch<R extends ModuleFlux>(
    predicate: PredicateModule<T>,
    next: (nav: ModuleNavigation<T>) => ModuleNavigation<R>
  ): T | R;

  toDescendantsMatching(
    matching: PredicateModule<ModuleFlux>,
    traversable: PredicateModule<ModuleFlux>
  ): ModuleNavigation<ModuleFlux>[];
}

export function navigate(
  workflow: Workflow,
  pluginParentingPolicy: PluginParentingPolicy = "module"
): WorkflowNavigation {
  const _log = log.getChildLogger("Navigate");
  function getGroups(): GroupModules.Module[] {
    _log.debug("getGroups");
    return workflow.modules
      .filter((maybeGroup) => maybeGroup instanceof GroupModules.Module)
      .map((group) => group as GroupModules.Module);
  }

  function getComponents(): Component.Module[] {
    _log.debug("getComponents");
    return workflow.modules
      .filter((maybeComponent) => maybeComponent instanceof Component.Module)
      .map((component) => component as Component.Module);
  }

  return {
    fromRoot(): ModuleNavigation<Component.Module> {
      _log.debug("fromRoot");
      return this.from(Component.rootComponentId);
    },

    from(moduleId: string): ModuleNavigation<ModuleFlux> {
      _log.debug("from {0}", { value: moduleId });
      const matching = this.fromMatching(predicateModuleId(moduleId));
      if (!matching) {
        throw new Error(`Cannot navigate to module ${moduleId}`);
      }
      return matching;
    },

    fromGroup(moduleId: string): ModuleNavigation<GroupModules.Module> {
      _log.debug("fromGroup {0}", { value: moduleId });
      const matching = this.fromGroupMatching(predicateModuleId(moduleId));
      if (!matching) {
        throw new Error(`Cannot navigate to group ${moduleId}`);
      }
      return matching;
    },

    fromComponent(moduleId: string): ModuleNavigation<Component.Module> {
      _log.debug("fromComponent {0}", { value: moduleId });
      const matching = this.fromComponentMatching(predicateModuleId(moduleId));
      if (!matching) {
        throw new Error(`Cannot navigate to component ${moduleId}`);
      }
      return matching;
    },

    fromMatching(
      predicate: PredicateModule<ModuleFlux>
    ): ModuleNavigation<ModuleFlux> {
      _log.debug("fromMatching");
      let mdle = workflow.modules.find(predicate);
      if (!mdle) {
        mdle = workflow.plugins.find(predicate);
      }
      return factoryModuleNavigation(workflow, mdle, pluginParentingPolicy);
    },

    fromGroupMatching(
      predicate: PredicateModule<GroupModules.Module>
    ): ModuleNavigation<GroupModules.Module> {
      _log.debug("fromGroupMatching");
      return factoryModuleNavigation(
        workflow,
        getGroups().find((candidate) => predicate(candidate)),
        pluginParentingPolicy
      );
    },

    fromComponentMatching(
      predicate: PredicateModule<Component.Module>
    ): ModuleNavigation<Component.Module> {
      _log.debug("fromComponentMatching");
      return factoryModuleNavigation(
        workflow,
        getComponents().find((candidate) => predicate(candidate)),
        pluginParentingPolicy
      );
    },
  };
}

function factoryModuleNavigation<T extends ModuleFlux>(
  workflow: Workflow,
  mdle: T,
  pluginParentingPolicy: PluginParentingPolicy
): ModuleNavigation<T> {
  if (!workflow) {
    throw new Error("workflow undefined");
  }
  if (!mdle) {
    throw new Error("mdle undefined");
  }
  const moduleId = mdle.moduleId;
  const _log = log
    .getChildLogger("ModuleNavigation")
    .getChildLogger(`[${moduleId}]`);
  return {
    toChildren(): ModuleNavigation<ModuleFlux>[] {
      _log.debug("toChildren");
      if (pluginParentingPolicy === "group") {
        throw new Error("Not implemented");
      }
      return getChildrenPluginPolicyModule(workflow, mdle).map((child) =>
        factoryModuleNavigation(workflow, child, pluginParentingPolicy)
      );
    },

    toParentComponent(): ModuleNavigation<Component.Module> {
      _log.debug("toParentComponent");
      if (this.toParent().get() instanceof Component.Module) {
        return this.toParent();
      } else {
        return this.toParent().toParentComponent();
      }
    },

    toParent(): ModuleNavigation<GroupModules.Module> {
      _log.debug("toParent");
      if (pluginParentingPolicy === "group") {
        throw new Error("Not implemented");
      }
      const parentModule = getParentPluginPolicyModule(workflow, mdle);

      return factoryModuleNavigation(
        workflow,
        parentModule,
        pluginParentingPolicy
      );
    },

    toAncestorMatching(
      predicate: PredicateModule<GroupModules.Module>
    ): ModuleNavigation<ModuleFlux> {
      _log.debug("toAncestorMatching");
      if (predicate(this.toParent().get())) {
        return this.toParent();
      } else {
        return this.toParent().toAncestorMatching(predicate);
      }
    },

    toDescendantsMatching(
      predicate: PredicateModule<ModuleFlux>,
      traversable: PredicateModule<ModuleFlux>
    ): ModuleNavigation<ModuleFlux>[] {
      _log.debug("toDescendantsMatching");
      const predicateNav = (candidate: ModuleNavigation<ModuleFlux>) =>
        predicate(candidate.get());
      const descendants: ModuleNavigation<ModuleFlux>[] = [];

      this.toChildren().forEach((childNav: ModuleNavigation<ModuleFlux>) => {
        descendants.push(childNav);
        if (traversable(childNav.get())) {
          descendants.push(
            ...childNav.toDescendantsMatching(predicate, traversable)
          );
        }
      });

      return descendants.filter(predicateNav);
    },

    get(): T {
      return mdle;
    },

    ifNoMatch<R extends ModuleFlux>(
      predicate: PredicateModule<T>,
      next: (nav: ModuleNavigation<T>) => ModuleNavigation<R>
    ): T | R {
      return predicate(mdle) ? mdle : next(this).get();
    },
  };
}

function getParentPluginPolicyModule(workflow: Workflow, mdle: ModuleFlux) {
  let parentModule;
  if (mdle instanceof PluginFlux) {
    parentModule = mdle.parentModule;
  } else {
    parentModule = navigate(workflow)
      .fromGroupMatching(
        (group) =>
          group.getModuleIds().find((childId) => childId === mdle.moduleId) !==
          undefined
      )
      .get();
  }

  return parentModule;
}

function getChildrenPluginPolicyModule(workflow: Workflow, mdle: ModuleFlux) {
  const _log = log
    .getChildLogger("getChildrenPluginPolicyModule")
    .getChildLogger(`[${mdle.moduleId}]`);
  const children: ModuleFlux[] = [];
  children.push(
    ...workflow.plugins.filter(
      (maybeChild) => maybeChild.parentModule.moduleId === mdle.moduleId
    )
  );
  if (mdle instanceof GroupModules.Module) {
    children.push(
      ...mdle
        .getDirectChildren(workflow)
        .filter((child) => !(child instanceof PluginFlux))
    );
  }
  _log.debug("Found {0} children", { cb: () => children.length });
  return children;
}
