(() => {
  const dashboardError = document.querySelector("#dashboard-error");
  let datasets = [];
  let openDropdown = null;

  function createDropdown(id, onSelect) {
    const filter = document.getElementById(id);
    const trigger = filter.querySelector(".filter-trigger");
    const label = document.getElementById(`${id}-value`);
    const options = document.getElementById(`${id}-options`);

    function setOpen(open) {
      if (open && openDropdown !== setOpen) {
        openDropdown?.(false);
        openDropdown = setOpen;
      } else if (!open && openDropdown === setOpen) {
        openDropdown = null;
      }
      trigger.setAttribute("aria-expanded", String(open));
      options.hidden = !open;
    }

    function closeOnExit(event) {
      if (!filter.contains(event.target)) setOpen(false);
    }

    trigger.addEventListener("click", () => setOpen(options.hidden));
    document.addEventListener("click", closeOnExit);

    filter.addEventListener("keydown", event => {
      if (event.key === "Escape" && !options.hidden) {
        event.preventDefault();
        setOpen(false);
        trigger.focus();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const choices = Array.from(options.querySelectorAll("button"));
      if (!choices.length) return;
      event.preventDefault();
      setOpen(true);
      const index = choices.indexOf(document.activeElement);
      const nextIndex = event.key === "ArrowDown" ? index + 1 : index - 1;
      const next = index === -1
        ? options.querySelector('[aria-current="true"]') ?? choices[0]
        : choices[(nextIndex + choices.length) % choices.length];
      next.focus();
    });

    return {
      setOptions(values) {
        options.replaceChildren(...values.map(value => {
          const button = document.createElement("button");
          button.type = "button";
          button.value = value;
          button.textContent = value;
          button.addEventListener("click", () => {
            onSelect(value);
            setOpen(false);
            trigger.focus();
          });
          return button;
        }));
      },
      setValue(value) {
        label.textContent = value;
        for (const choice of options.querySelectorAll("button")) {
          choice.setAttribute("aria-current", String(choice.value === value));
        }
      },
      showUnavailable() {
        label.textContent = "Unavailable";
        const message = document.createElement("p");
        message.textContent = "Options could not be loaded.";
        options.replaceChildren(message);
      }
    };
  }

  function publishSelection(dataset) {
    cellTrackDropdown.setValue(dataset.cellTrack);
    sequenceDropdown.setValue(dataset.sequence);
    const selection = {...dataset};
    window.dashboardSelection = selection;
    window.dispatchEvent(new CustomEvent("dashboardselectionchange", {detail:selection}));
  }

  function selectCellTrack(cellTrack, preferredSequence) {
    const available = datasets
      .filter(dataset => dataset.cellTrack === cellTrack)
      .sort((a, b) => a.sequence.localeCompare(b.sequence, undefined, {numeric:true}));
    const selected = available.find(dataset => dataset.sequence === preferredSequence) ?? available[0];
    if (!selected) return;

    sequenceDropdown.setOptions(available.map(dataset => dataset.sequence));
    publishSelection(selected);
  }

  function selectSequence(sequence) {
    const current = window.dashboardSelection;
    const dataset = datasets.find(entry => entry.cellTrack === current?.cellTrack && entry.sequence === sequence);
    if (dataset && dataset.sequence !== current.sequence) publishSelection(dataset);
  }

  const cellTrackDropdown = createDropdown("cell-track", cellTrack => {
    selectCellTrack(cellTrack, window.dashboardSelection?.sequence);
  });
  const sequenceDropdown = createDropdown("sequence", selectSequence);
  window.selectDashboardSequence = selectSequence;

  function showLoadError(...message) {
    cellTrackDropdown.showUnavailable();
    sequenceDropdown.showUnavailable();
    dashboardError.replaceChildren(...message);
    dashboardError.hidden = false;
  }

  async function initializeDashboard() {
    if (window.location.protocol === "file:") {
      const localDashboard = document.createElement("a");
      localDashboard.href = "http://localhost:8000/";
      localDashboard.textContent = "localhost:8000";
      showLoadError(
        "Open the dashboard at ", localDashboard,
        " to load cell tracks and sequences. If the server is stopped, run python3 -m http.server 8000 from the project folder."
      );
      return;
    }

    try {
      const response = await fetch("data/datasets.json");
      if (!response.ok) throw new Error(`Dataset manifest request failed (${response.status}).`);
      datasets = await response.json();
      if (!Array.isArray(datasets) || datasets.length === 0) {
        throw new Error("The dataset manifest is empty or invalid.");
      }

      const cellTracks = [...new Set(datasets.map(dataset => dataset.cellTrack))]
        .sort((a, b) => a.localeCompare(b));
      cellTrackDropdown.setOptions(cellTracks);
      const initialDataset = datasets[0];
      selectCellTrack(initialDataset.cellTrack, initialDataset.sequence);
    } catch (error) {
      showLoadError(`Could not load the cell tracks and sequences. Refresh the page to try again. ${error.message}`);
    }
  }

  initializeDashboard();
})();
