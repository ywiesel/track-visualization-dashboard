(() => {
  const container = d3.select("#visualization2");
  const cellTrackSelect = document.querySelector("#cell-track");

  let datasets = [];
  let manifestLoaded = false;
  let latestRequest = 0;

  function showMessage(message) {
    container.text(message);
  }

  async function loadCellTrack(cellTrack) {
    const requestId = ++latestRequest;
    const selectedDatasets = datasets.filter(
      dataset => dataset.cellTrack === cellTrack
    );

    if (selectedDatasets.length === 0) {
      showMessage(`No sequences found for ${cellTrack}.`);
      return;
    }

    try {
      const averages = [];

      for (const dataset of selectedDatasets) {
        const rows = await d3.csv(dataset.path);

        if (requestId !== latestRequest) return;

        const bins = new Map();

        for (const row of rows) {
          const frame = Number(row.frame_t);
          const displacement = Number(row.DISPLACEMENT);

          if (!Number.isFinite(frame) || !Number.isFinite(displacement)) {
            continue;
          }

          const frameRangeStart = Math.floor(frame / 50) * 50;
          const current = bins.get(frameRangeStart) ?? {sum: 0, count: 0};

          current.sum += displacement;
          current.count += 1;
          bins.set(frameRangeStart, current);
        }

        for (const [frameRangeStart, values] of bins) {
          averages.push({
            cellTrack: dataset.cellTrack,
            sequence: dataset.sequence,
            frameRangeStart,
            averageDisplacement: values.sum / values.count,
            observationCount: values.count
          });
        }
      }

      if (requestId !== latestRequest) return;

      showMessage(
        `Loaded ${selectedDatasets.length} sequences for ${cellTrack} ` +
        `and calculated ${averages.length} sequence-by-time averages.`
      );

      console.table(averages.slice(0, 10));
    } catch (error) {
      showMessage(`Could not load the CSV data: ${error.message}`);
    }
  }

  window.addEventListener("dashboardselectionchange", event => {
    if (manifestLoaded) {
      loadCellTrack(event.detail.cellTrack);
    }
  });

  async function initialize() {
    try {
      const response = await fetch("data/datasets.json");
      if (!response.ok) {
        throw new Error(`Dataset list request failed (${response.status}).`);
      }

      datasets = await response.json();
      manifestLoaded = true;

      const cellTrack =
        window.dashboardSelection?.cellTrack ?? cellTrackSelect.value;

      if (cellTrack) {
        loadCellTrack(cellTrack);
      }
    } catch (error) {
      showMessage(`Could not load the dataset list: ${error.message}`);
    }
  }

  initialize();
})();
