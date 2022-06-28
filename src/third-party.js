const Audit = require("lighthouse/lighthouse-core/audits/audit");
const NetworkRecords = require("lighthouse/lighthouse-core/computed/network-records.js");
const MainThreadTasks = require("lighthouse/lighthouse-core/computed/main-thread-tasks.js");
const {
  getJavaScriptURLs,
  getAttributableURLForTask,
} = require("lighthouse/lighthouse-core/lib/tracehouse/task-summary.js");
const { getEntity } = require("./entity-finder");
/**
 *
 * @param {String} url
 * @returns {Boolean}
 */
function validateUrl(url) {
  return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
    url
  );
}

const UIStrings = {
  title: "Minimize third-party usage",
  description:
    "Third-party code can significantly impact load performance. " +
    "Limit the number of redundant third-party providers and try to load third-party code after " +
    "your page has primarily finished loading. [Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/loading-third-party-javascript/).",
  columnThirdParty: "Third-Party",
  displayValue:
    "Third-party code blocked the main thread for " +
    `{timeInMs, number, milliseconds}\xa0ms`,
};

// A page passes when all third-party code blocks for less than 250 ms.
class ThirdPartySummary extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: "third-party-summary",
      title: UIStrings.title,
      failureTitle: UIStrings.failureTitle,
      description: UIStrings.description,
      requiredArtifacts: ["traces", "devtoolsLogs", "URL"],
    };
  }

  /**
   *
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {Array<LH.Artifacts.TaskNode>} mainThreadTasks
   * @param {number} cpuMultiplier
   * @return {SummaryMaps}
   */
  static getSummaries(networkRecords, mainThreadTasks, cpuMultiplier) {
    /** @type {Map<ThirdPartyEntity, Summary>} */
    const byEntity = new Map();
    const defaultSummary = {
      mainThreadTime: 0,
      blockingTime: 0,
      transferSize: 0,
      resourceSize: 0,
    };
    /** @type {Map<string, Summary>} */
    const jsURLs = getJavaScriptURLs(networkRecords);

    const byURL = new Map();
    for (const request of networkRecords) {
      if (!jsURLs.has(request.url)) continue;
      const urlSummary = byURL.get(request.url) || {
        ...defaultSummary,
        intervals: [],
      };
      urlSummary.transferSize += request.transferSize;
      urlSummary.resourceSize += request.resourceSize;
      byURL.set(request.url, urlSummary);
    }

    for (const task of mainThreadTasks) {
      const attributableURL = getAttributableURLForTask(task, jsURLs);
      if (jsURLs.has(attributableURL)) {
        const urlSummary = byURL.get(attributableURL) || {
          ...defaultSummary,
          intervals: [],
        };
        const taskDuration = task.selfTime * cpuMultiplier;
        // The amount of time spent on main thread is the sum of all durations.
        urlSummary.mainThreadTime += taskDuration;
        // The amount of time spent *blocking* on main thread is the sum of all time longer than 50ms.
        // Note that this is not totally equivalent to the TBT definition since it fails to account for FCP,
        // but a majority of third-party work occurs after FCP and should yield largely similar numbers.
        urlSummary.blockingTime += Math.max(taskDuration - 50, 0);
        urlSummary.intervals.push({
          startTime: task.startTime,
          endTime: task.endTime,
        });
        byURL.set(attributableURL, urlSummary);
      }
    }

    // Map each URL's stat to a particular third party entity.
    /** @type {Map<ThirdPartyEntity, string[]>} */
    const urls = new Map();
    for (const [url, urlSummary] of byURL.entries()) {
      urlSummary.intervals = urlSummary.intervals.sort(
        (a, b) => Number(a.startTime) - Number(b.startTime)
      );
      const intervals = [];
      for (let interval of urlSummary.intervals) {
        if (
          intervals.length == 0 ||
          intervals.at(-1).endTime < interval.startTime
        ) {
          intervals.push(interval);
        } else {
          intervals.at(-1).endTime = Math.max(
            intervals.at(-1).endTime,
            interval.endTime
          );
        }
      }
      urlSummary.intervals = intervals;
      byURL.set(url, urlSummary);

      const entity = validateUrl(url) ? new URL(url).host : "other";
      const entitySummary = byEntity.get(entity) || {
        ...defaultSummary,
        intervals: [],
      };
      entitySummary.transferSize += urlSummary.transferSize;
      entitySummary.resourceSize += urlSummary.resourceSize;
      entitySummary.mainThreadTime += urlSummary.mainThreadTime;
      entitySummary.blockingTime += urlSummary.blockingTime;
      entitySummary.intervals = entitySummary.intervals.concat(
        urlSummary.intervals
      );
      if (!entitySummary.entityName) {
        const entityName = getEntity(url);
        if (entityName) {
          entitySummary.entityName = entityName;
          entitySummary.isThirdParty = true;
        }
      }
      byEntity.set(entity, entitySummary);

      const entityURLs = urls.get(entity) || [];
      entityURLs.push(url);
      urls.set(entity, entityURLs);
    }

    for (const [entity, entitySummary] of byEntity.entries()) {
      entitySummary.intervals = entitySummary.intervals.sort(
        (a, b) => Number(a.startTime) - Number(b.startTime)
      );
      const intervals = [];
      for (let interval of entitySummary.intervals) {
        if (
          intervals.length == 0 ||
          intervals.at(-1).endTime < interval.startTime
        ) {
          intervals.push(interval);
        } else {
          intervals.at(-1).endTime = Math.max(
            intervals.at(-1).endTime,
            interval.endTime
          );
        }
      }
      entitySummary.intervals = intervals;
      byEntity.set(entity, entitySummary);
    }

    return { byURL, byEntity, urls };
  }

  /**
   * @param {ThirdPartyEntity} entity
   * @param {SummaryMaps} summaries
   * @param {Summary} stats
   * @return {Array<URLSummary>}
   */
  static makeSubItems(entity, summaries, stats) {
    const entityURLs = summaries.urls.get(entity) || [];
    let items = entityURLs
      .map(
        (url) =>
          /** @type {URLSummary} */ ({ url, ...summaries.byURL.get(url) })
      )
      // Sort by blocking time first, then transfer size to break ties.
      .sort(
        (a, b) =>
          b.blockingTime - a.blockingTime ||
          b.transferSize - a.transferSize ||
          b.resourceSize - a.resourceSize
      );

    const subitemSummary = {
      transferSize: 0,
      blockingTime: 0,
      resourceSize: 0,
    };

    let numSubItems = 0;
    for (let nextSubItem in items) {
      numSubItems++;
      subitemSummary.transferSize += nextSubItem.transferSize;
      subitemSummary.blockingTime += nextSubItem.blockingTime;
    }
    // Only show the top N entries for brevity. If there is more than one remaining entry
    // we'll replace the tail entries with single remainder entry.
    items = items.slice(0, numSubItems);
    return items;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings || {};
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    var url = artifacts.URL.finalUrl;
    const mainEntity = validateUrl(url)
      ? new URL(artifacts.URL.finalUrl).host
      : "other";
    const tasks = await MainThreadTasks.request(trace, context);
    const multiplier =
      settings.throttlingMethod === "simulate"
        ? settings.throttling.cpuSlowdownMultiplier
        : 1;

    const summaries = ThirdPartySummary.getSummaries(
      networkRecords,
      tasks,
      multiplier
    );
    const overallSummary = { wastedBytes: 0, wastedMs: 0 };

    const results = Array.from(summaries.byEntity.entries())
      // Don't consider the domain we're on to be third-party.
      // e.g. Facebook SDK isn't a third-party script on facebook.com
      .filter(([entity]) => !(mainEntity && mainEntity === entity))
      .map(([entity, stats]) => {
        overallSummary.wastedBytes += stats.transferSize;
        overallSummary.wastedMs += stats.blockingTime;

        return {
          ...stats,
          entity: {
            type: /** @type {const} */ "link",
            text: entity,
            url: entity || "",
          },
          subItems: {
            type: /** @type {const} */ "subitems",
            items: ThirdPartySummary.makeSubItems(entity, summaries, stats),
          },
        };
      })
      // Sort by blocking time first, then transfer size to break ties.
      .sort(
        (a, b) =>
          b.mainThreadTime - a.mainThreadTime ||
          b.blockingTime - a.blockingTime ||
          b.transferSize - a.transferSize ||
          b.resourceSize - a.resourceSize
      );

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {
        key: "entity",
        itemType: "link",
        text: UIStrings.columnThirdParty,
        subItemsHeading: { key: "url", itemType: "url" },
      },
      {
        key: "transferSize",
        granularity: 1,
        itemType: "bytes",
        text: "Transfer Size",
        subItemsHeading: { key: "transferSize" },
      },
      {
        key: "blockingTime",
        granularity: 1,
        itemType: "ms",
        text: "Main-thread Blocking Time",
        subItemsHeading: { key: "blockingTime" },
      },
      {
        key: "resourceSize",
        granularity: 1,
        itemType: "bytes",
        text: "Resource Size",
        subItemsHeading: { key: "resourceSize" },
      },
      /* eslint-enable max-len */
    ];

    return {
      details: Audit.makeTableDetails(headings, results, overallSummary),
    };
  }
}

module.exports = {
  ThirdPartySummary,
  UIStrings,
};
