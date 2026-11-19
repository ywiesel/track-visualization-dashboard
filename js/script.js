(() => {
  const cellTrackSelect = document.querySelector("#cell-track");
  const sequenceSelect = document.querySelector("#sequence");
  const dashboardError = document.querySelector("#dashboard-error");
  let datasets = [];

  function addOptions(select, values, getValue = value => value, getLabel = value => value) {
    select.replaceChildren(...values.map(value => {
      const option = document.createElement("option");
      option.value = getValue(value);
      option.textContent = getLabel(value);
      return option;
    }));
  }

  function datasetsForCellTrack(cellTrack) {
    return datasets
      .filter(dataset => dataset.cellTrack === cellTrack)
      .sort((a, b) => a.sequence.localeCompare(b.sequence, undefined, {numeric:true}));
  }

  function publishSelection() {
    const dataset = datasetsForCellTrack(cellTrackSelect.value)
      .find(entry => entry.sequence === sequenceSelect.value);
    if (!dataset) return;

    const selection = {...dataset};
    window.dashboardSelection = selection;
    window.dispatchEvent(new CustomEvent("dashboardselectionchange", {detail:selection}));
  }

  function selectCellTrack(cellTrack, preferredSequence) {
    const availableDatasets = datasetsForCellTrack(cellTrack);
    addOptions(sequenceSelect, availableDatasets, dataset => dataset.sequence, dataset => dataset.sequence);

    const selectedDataset = availableDatasets.find(dataset => dataset.sequence === preferredSequence)
      ?? availableDatasets[0];

    sequenceSelect.value = selectedDataset.sequence;
    publishSelection();
  }

  async function initializeDashboard() {
    try {
      const response = await fetch("data/datasets.json");
      if (!response.ok) throw new Error(`Dataset manifest request failed (${response.status}).`);
      datasets = await response.json();
      if (!Array.isArray(datasets) || datasets.length === 0) {
        throw new Error("The dataset manifest is empty or invalid.");
      }

      const cellTracks = [...new Set(datasets.map(dataset => dataset.cellTrack))]
        .sort((a, b) => a.localeCompare(b));
      addOptions(cellTrackSelect, cellTracks);
      const initialDataset = datasets[0];
      cellTrackSelect.value = initialDataset.cellTrack;

      cellTrackSelect.addEventListener("change", () => {
        selectCellTrack(cellTrackSelect.value, sequenceSelect.value);
      });
      sequenceSelect.addEventListener("change", publishSelection);
      selectCellTrack(initialDataset.cellTrack, initialDataset.sequence);
    } catch (error) {
      dashboardError.textContent = `Could not load dataset options: ${error.message}`;
      dashboardError.hidden = false;
    }
  }

  initializeDashboard();
})();
