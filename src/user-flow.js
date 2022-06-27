const {
  generateFlowReportHtml,
} = require("lighthouse/report/generator/report-generator.js");
const {
  snapshotGather,
} = require("lighthouse/lighthouse-core/fraggle-rock/gather/snapshot-runner.js");
const {
  startTimespanGather,
} = require("lighthouse/lighthouse-core/fraggle-rock/gather/timespan-runner.js");
const {
  navigationGather,
} = require("lighthouse/lighthouse-core/fraggle-rock/gather/navigation-runner.js");
const Runner = require("lighthouse/lighthouse-core/runner.js");
const {
  initializeConfig,
} = require("lighthouse/lighthouse-core/fraggle-rock/config/config.js");
const { ThirdPartySummary } = require("./third-party");


class UserFlow {
  /**
   * @param {FrOptions['page']} page
   * @param {UserFlowOptions=} options
   */
  constructor(page, options) {
    this.options = { page, ...options };
    this.name = options?.name;
    this._gatherSteps = [];
    this._gatherStepRunnerOptions = new WeakMap();
  }

  /**
   * @param {string} longUrl
   * @returns {string}
   */
  _shortenUrl(longUrl) {
    const url = new URL(longUrl);
    return `${url.hostname}${url.pathname}`;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {string}
   */
  _getDefaultStepName(artifacts) {
    const shortUrl = this._shortenUrl(artifacts.URL.finalUrl);
    switch (artifacts.GatherContext.gatherMode) {
      case "navigation":
        return `Navigation report (${shortUrl})`;
      case "timespan":
        return `Timespan report (${shortUrl})`;
      case "snapshot":
        return `Snapshot report (${shortUrl})`;
    }
  }

  /**
   * @param {StepOptions=} stepOptions
   */
  _getNextNavigationOptions(stepOptions) {
    const options = { ...this.options, ...stepOptions };
    const configContext = { ...options.configContext };
    const settingsOverrides = { ...configContext.settingsOverrides };

    if (configContext.skipAboutBlank === undefined) {
      configContext.skipAboutBlank = true;
    }

    // On repeat navigations, we want to disable storage reset by default (i.e. it's not a cold load).
    const isSubsequentNavigation = this._gatherSteps.some(
      (step) => step.artifacts.GatherContext.gatherMode === "navigation"
    );
    if (isSubsequentNavigation) {
      if (settingsOverrides.disableStorageReset === undefined) {
        settingsOverrides.disableStorageReset = true;
      }
    }

    configContext.settingsOverrides = settingsOverrides;
    options.configContext = configContext;

    return options;
  }

  /**
   *
   * @param {LH.Gatherer.FRGatherResult} gatherResult
   * @param {StepOptions} options
   */
  _addGatherStep(gatherResult, options) {
    const providedName = options?.stepName;
    const gatherStep = {
      artifacts: gatherResult.artifacts,
      name: providedName || this._getDefaultStepName(gatherResult.artifacts),
      config: options.config,
      configContext: options.configContext,
    };
    this._gatherSteps.push(gatherStep);
    this._gatherStepRunnerOptions.set(gatherStep, gatherResult.runnerOptions);
  }

  /**
   * @param {LH.NavigationRequestor} requestor
   * @param {StepOptions=} stepOptions
   */
  async navigate(requestor, stepOptions) {
    if (this.currentTimespan) throw new Error("Timespan already in progress");

    const options = this._getNextNavigationOptions(stepOptions);
    const gatherResult = await navigationGather(requestor, options);

    this._addGatherStep(gatherResult, options);

    return gatherResult;
  }

  /**
   * @param {StepOptions=} stepOptions
   */
  async startTimespan(stepOptions) {
    if (this.currentTimespan) throw new Error("Timespan already in progress");

    const options = { ...this.options, ...stepOptions };
    const timespan = await startTimespanGather(options);
    this.currentTimespan = { timespan, options };
  }

  async endTimespan() {
    if (!this.currentTimespan) throw new Error("No timespan in progress");

    const { timespan, options } = this.currentTimespan;
    const gatherResult = await timespan.endTimespanGather();
    this.currentTimespan = undefined;

    this._addGatherStep(gatherResult, options);

    return gatherResult;
  }

  /**
   * @param {StepOptions=} stepOptions
   */
  async snapshot(stepOptions) {
    if (this.currentTimespan) throw new Error("Timespan already in progress");

    const options = { ...this.options, ...stepOptions };
    const gatherResult = await snapshotGather(options);

    this._addGatherStep(gatherResult, options);

    return gatherResult;
  }

  /**
   * @returns {Promise<LH.FlowResult>}
   */
  async createFlowResult() {
    return auditGatherSteps(this._gatherSteps, {
      name: this.name,
      config: this.options.config,
      gatherStepRunnerOptions: this._gatherStepRunnerOptions,
    });
  }

  /**
   * @return {Promise<string>}
   */
  async generateReport() {
    const flowResult = await this.createFlowResult();
    return generateFlowReportHtml(flowResult);
  }

  /**
   * @return {LH.UserFlow.FlowArtifacts}
   */
  createArtifactsJson() {
    return {
      gatherSteps: this._gatherSteps,
      name: this.name,
    };
  }
}

/**
 * @param {Array<LH.UserFlow.GatherStep>} gatherSteps
 * @param {{name?: string, config?: LH.Config.Json, gatherStepRunnerOptions?: GatherStepRunnerOptions}} options
 */
async function auditGatherSteps(gatherSteps, options) {
  if (!gatherSteps.length) {
    throw new Error("Need at least one step before getting the result");
  }

  /** @type {LH.FlowResult['steps']} */
  const steps = [];
  for (const gatherStep of gatherSteps) {
    const { artifacts, name, configContext } = gatherStep;

    let runnerOptions = options.gatherStepRunnerOptions?.get(gatherStep);

    // If the gather step is not active, we must recreate the runner options.
    if (!runnerOptions) {
      // Step specific configs take precedence over a config for the entire flow.
      const configJson = gatherStep.config || options.config;
      const { gatherMode } = artifacts.GatherContext;
      const { config } = await initializeConfig(configJson, {
        ...configContext,
        gatherMode,
      });
      runnerOptions = {
        config,
        computedCache: new Map(),
      };
    }

    const result = await Runner.audit(artifacts, runnerOptions);
    const thirdPartyResult = await ThirdPartySummary.audit(
      artifacts,
      runnerOptions
    );
    result.lhr.audits["third-party-summary"] = thirdPartyResult
    if (!result) throw new Error(`Step "${name}" did not return a result`);
    steps.push({ lhr: result.lhr, name });
  }

  const url = new URL(gatherSteps[0].artifacts.URL.finalUrl);
  const flowName = options.name || `User flow (${url.hostname})`;
  return { steps, name: flowName };
}

module.exports = {
  UserFlow,
  auditGatherSteps,
};
