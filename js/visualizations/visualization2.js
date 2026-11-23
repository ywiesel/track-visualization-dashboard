(() => {
  const container = d3.select("#visualization2");
  const cellTrackSelect = document.querySelector("#cell-track");
  const sequenceSelect = document.querySelector("#sequence"); 

  let datasets = [];
  let manifestLoaded = false;
  let latestRequest = 0;
  let currentFrameFilter = null;
  let currentCellTrack = null;
  
  function showMessage(message) {
    container.text(message);
  }

  function selectSequence(sequence) {
    sequenceSelect.value = sequence;
    sequenceSelect.dispatchEvent(
      new Event("change", {bubbles: true})
    );
  }

  function renderHeatMap(averages, selectedDatasets) {
    container.selectAll("*").remove();

    if (averages.length === 0) {
      showMessage("No displacement values were found for this cell line.");
      return;
    }

    const sequences = selectedDatasets.map(dataset => dataset.sequence);
    const frameRanges = [...new Set(averages.map(d => d.frameRangeStart))]
      .sort((a, b) => a - b);

    if (currentFrameFilter === null) {
      currentFrameFilter = [frameRanges[0], frameRanges[frameRanges.length - 1]];
    }

    const [startRange, endRange] = currentFrameFilter;
    const visibleFrameRanges = frameRanges.filter(
      range => range >= startRange && range <= endRange
    );

    const controls = container.append("div")
      .attr("class", "heatmap-controls");

    const startLabel = controls.append("label")
      .text(`Start frame range: ${startRange}`);

    const startSlider = startLabel.append("input")
      .attr("type", "range")
      .attr("min", 0)
      .attr("max", frameRanges.length - 1)
      .attr("step", 1)
      .property("value", frameRanges.indexOf(startRange));

    const endLabel = controls.append("label")
      .text(`Last frame-range start: ${endRange}`);

    const endSlider = endLabel.append("input")
      .attr("type", "range")
      .attr("min", 0)
      .attr("max", frameRanges.length - 1)
      .attr("step", 1)
      .property("value", frameRanges.indexOf(endRange));

    function updateFrameFilter() {
      let startIndex = Number(startSlider.property("value"));
      let endIndex = Number(endSlider.property("value"));

      if (startIndex > endIndex) {
        startIndex = endIndex;
        startSlider.property("value", startIndex);
      }

      currentFrameFilter = [frameRanges[startIndex], frameRanges[endIndex]];
      renderHeatMap(averages, selectedDatasets);
    }

    startSlider.on("input", updateFrameFilter);
    endSlider.on("input", updateFrameFilter);

    const width = Math.max(320, container.node().clientWidth);
    const margin = {top: 42, right: 16, bottom: 38, left: 82};
    const rowHeight = 27;
    const height = margin.top + sequences.length * rowHeight + margin.bottom;

    const svg = container.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("height", height)
      .attr("role", "img")
      .attr("aria-label", "Average displacement by sequence and 50-frame range");

    const x = d3.scaleBand()
      .domain(visibleFrameRanges)
      .range([margin.left, width - margin.right])
      .padding(0.04);

    const y = d3.scaleBand()
      .domain(sequences)
      .range([margin.top, margin.top + sequences.length * rowHeight])
      .padding(0.08);

    const colorExtent = d3.extent(averages, d => d.averageDisplacement);
    const color = d3.scaleSequential(d3.interpolateBlues)
      .domain(colorExtent[0] === colorExtent[1]
        ? [colorExtent[0] - 1, colorExtent[1] + 1]
        : colorExtent);

    const values = new Map(
      averages.map(d => [`${d.sequence}|${d.frameRangeStart}`, d])
    );

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${margin.top})`)
      .call(d3.axisTop(x).tickFormat(d => d));

    svg.append("text")
      .attr("x", (margin.left + width - margin.right) / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("class", "axis-label")
      .text("Frame range start (50-frame intervals)");

    const yAxis = svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    yAxis.selectAll(".tick text")
      .style("cursor", "pointer")
      .on("click", (_event, sequence) => selectSequence(sequence));

    for (const sequence of sequences) {
      for (const frameRangeStart of visibleFrameRanges) {
        const value = values.get(`${sequence}|${frameRangeStart}`);

        svg.append("rect")
          .attr("x", x(frameRangeStart))
          .attr("y", y(sequence))
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .attr("fill", value ? color(value.averageDisplacement) : "#f1f4f7")
          .style("cursor", "pointer")
          .on("click", () => selectSequence(sequence))
          .append("title")
          .text(value
            ? `${sequence}, frames ${frameRangeStart}–${frameRangeStart + 49}: ` +
              `average displacement ${value.averageDisplacement.toFixed(2)}`
            : `${sequence}, frames ${frameRangeStart}–${frameRangeStart + 49}: no observations`);
      }
    }

    container.append("p")
      .attr("class", "chart-note")
      .text("Darker squares indicate higher average displacement. Blank squares indicate no observations in that frame range.");
  }

  async function loadCellTrack(cellTrack) {
    const requestId = ++latestRequest;

    if (currentCellTrack !== cellTrack) {
      currentCellTrack = cellTrack;
      currentFrameFilter = null;
    }

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
          const displacementText = row.DISPLACEMENT?.trim();

          if (
            !Number.isFinite(frame) ||
            displacementText === undefined ||
            displacementText === ""
          ) {
            continue;
          }

          const displacement = Number(displacementText);

          if (!Number.isFinite(displacement)) {
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

      renderHeatMap(averages, selectedDatasets);
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
