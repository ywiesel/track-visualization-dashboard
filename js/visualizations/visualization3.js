(() => {
  const BAR_COUNT = 40;
  const MARGINS = {top:22, right:18, bottom:62, left:62};
  const svg = d3.select("#visualization3");
  const tooltip = d3.select("#bar-tooltip");
  const summary = document.querySelector("#summary");
  const visualization = document.querySelector("#visualization3");

  let latestRequest = 0;
  let currentData = null;
  let currentSelection = null;

  function parsePositionRows(rows) {
    return rows
      .map(row => ({trackId:row.track_id, position:Number(row.position_x_t)}))
      .filter(row => row.trackId !== undefined && row.trackId !== "" && Number.isFinite(row.position));
  }

  function makePositionBins(data) {
    const [observedMin, observedMax] = d3.extent(data, row => row.position);
    const min = observedMin === observedMax ? observedMin - 0.5 : observedMin;
    const max = observedMin === observedMax ? observedMax + 0.5 : observedMax;
    const binWidth = (max - min) / BAR_COUNT;
    const bins = d3.range(BAR_COUNT).map(index => ({
      x0:min + index * binWidth,
      x1:min + (index + 1) * binWidth,
      trackIds:new Set(),
      observationCount:0
    }));

    for (const row of data) {
      const index = Math.max(0, Math.min(BAR_COUNT - 1, Math.floor((row.position - min) / binWidth)));
      bins[index].trackIds.add(row.trackId);
      bins[index].observationCount += 1;
    }

    return {bins, min, max};
  }

  function showBarDetails(bin, totalTrackCount) {
    const trackCount = bin.trackIds.size;
    const trackShare = totalTrackCount ? (trackCount / totalTrackCount * 100).toFixed(1) : "0.0";

    tooltip.html([
      `<strong>${bin.x0.toFixed(1)}–${bin.x1.toFixed(1)} px</strong>`,
      `<div>Distinct tracks: ${trackCount.toLocaleString()}</div>`,
      `<div>Position observations: ${bin.observationCount.toLocaleString()}</div>`,
      `<div>Share of tracks in sequence: ${trackShare}%</div>`
    ].join(""));
  }

  function renderSummary(data, min, max) {
    const trackIds = new Set(data.map(row => row.trackId));
    summary.innerHTML = [
      `<span><strong>${trackIds.size.toLocaleString()}</strong> distinct tracks</span>`,
      `<span><strong>${data.length.toLocaleString()}</strong> observations</span>`,
      `<span><strong>${min.toFixed(0)}–${max.toFixed(0)}</strong> px observed</span>`
    ].join("");
  }

  function renderAxes(plot, xScale, yScale, width, height) {
    const plotWidth = width - MARGINS.left - MARGINS.right;

    plot.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${MARGINS.left},0)`)
      .call(d3.axisLeft(yScale).ticks(4).tickSize(-plotWidth).tickFormat(""));

    plot.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - MARGINS.bottom})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(".0f")));

    plot.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${MARGINS.left},0)`)
      .call(d3.axisLeft(yScale).ticks(4).tickFormat(d3.format("d")));

    plot.append("text")
      .attr("x", (MARGINS.left + width - MARGINS.right) / 2)
      .attr("y", height - 13)
      .attr("text-anchor", "middle")
      .attr("class", "axis-label")
      .text("Horizontal cell position (pixels)");

    plot.append("text")
      .attr("transform", `translate(17,${(MARGINS.top + height - MARGINS.bottom) / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("class", "axis-label")
      .text("Distinct tracks");
  }

  function renderBars(plot, bins, xScale, yScale, totalTrackCount) {
    plot.selectAll("rect.bar")
      .data(bins)
      .join("rect")
      .attr("class", "bar")
      .attr("x", bin => xScale(bin.x0) + 1)
      .attr("y", bin => yScale(bin.trackIds.size))
      .attr("width", bin => Math.max(1, xScale(bin.x1) - xScale(bin.x0) - 2))
      .attr("height", bin => yScale(0) - yScale(bin.trackIds.size))
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-describedby", "bar-tooltip")
      .attr("aria-label", bin =>
        `${bin.trackIds.size} distinct tracks and ${bin.observationCount} observations ` +
        `between ${bin.x0.toFixed(1)} and ${bin.x1.toFixed(1)} pixels`)
      .on("mouseover", (_event, bin) => showBarDetails(bin, totalTrackCount))
      .on("focus", (_event, bin) => showBarDetails(bin, totalTrackCount))
      .append("title")
      .text(bin =>
        `${bin.x0.toFixed(1)}–${bin.x1.toFixed(1)} px · ` +
        `${bin.trackIds.size} distinct tracks · ${bin.observationCount} position observations`);
  }

  function renderVisualization(data, selection) {
    const {bins, min, max} = makePositionBins(data);
    const totalTrackCount = new Set(data.map(row => row.trackId)).size;
    const width = Math.max(320, visualization.parentElement.clientWidth - 4);
    const height = width < 560 ? 330 : 410;
    const xScale = d3.scaleLinear()
      .domain([min, max])
      .range([MARGINS.left, width - MARGINS.right]);
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(bins, bin => bin.trackIds.size) || 1])
      .nice(4)
      .range([height - MARGINS.bottom, MARGINS.top]);

    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
    const plot = svg.append("g");

    renderAxes(plot, xScale, yScale, width, height);
    renderBars(plot, bins, xScale, yScale, totalTrackCount);
    renderSummary(data, min, max);
    tooltip.text(`Showing ${selection.cellTrack} · ${selection.sequence}. Hover over or focus a bar for details.`);
  }

  function showLoadError(message) {
    svg.selectAll("*").remove();
    svg.attr("viewBox", "0 0 800 90").attr("height", 90);
    svg.append("text")
      .attr("x", "50%")
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .attr("fill", "#9a2633")
      .text("Could not load the selected dataset. Check the CSV path and run the site from a local server.");
    summary.textContent = message;
    tooltip.text("Bar details are unavailable until the dataset loads.");
  }

  async function loadSelection(selection) {
    if (!selection?.path) return;
    const requestId = ++latestRequest;

    try {
      const rows = await d3.csv(selection.path);
      if (requestId !== latestRequest) return;

      const data = parsePositionRows(rows);
      if (data.length === 0) throw new Error("The selected CSV contains no valid horizontal positions.");

      currentData = data;
      currentSelection = selection;
      renderVisualization(currentData, currentSelection);
    } catch (error) {
      if (requestId === latestRequest) showLoadError(error.message);
    }
  }

  window.addEventListener("dashboardselectionchange", event => loadSelection(event.detail));
  window.addEventListener("resize", () => {
    if (currentData && currentSelection) renderVisualization(currentData, currentSelection);
  });

  if (window.dashboardSelection) loadSelection(window.dashboardSelection);
})();
