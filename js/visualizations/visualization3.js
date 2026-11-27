(() => {
  const svg = d3.select("#visualization3");
  const summary = document.querySelector("#duration-summary");
  const details = document.querySelector("#duration-details");
  const colors = ["#ef6b62", "#59b86e", "#548ee5", "#d9a54a", "#9d79d0",
    "#47adb7", "#da77a5", "#819c55", "#a88471"];
  const cache = new Map();

  let manifest;
  let groups = [];
  let selection;
  let selectedTrack = null;
  let requestId = 0;

  function getTracks(rows) {
    const tracks = new Map();
    for (const row of rows) {
      const id = row.track_id?.trim();
      const frameText = row.frame_t?.trim();
      const frame = Number(frameText);
      if (!id || !frameText || !Number.isInteger(frame) || frame < 0) continue;

      const track = tracks.get(id) ?? {id, start:frame, end:frame};
      track.start = Math.min(track.start, frame);
      track.end = Math.max(track.end, frame);
      tracks.set(id, track);
    }
    return Array.from(tracks.values(), track => ({
      ...track, duration:track.end - track.start + 1
    })).sort((a, b) => a.duration - b.duration || d3.ascending(a.id, b.id));
  }

  function loadTracks(path) {
    if (!cache.has(path)) {
      cache.set(path, d3.csv(path).then(getTracks).catch(error => {
        cache.delete(path);
        throw error;
      }));
    }
    return cache.get(path);
  }

  function showTrack(track) {
    details.textContent = track
      ? `${track.sequence} · Track ${track.id} · ${track.duration} ${track.duration === 1 ? "frame" : "frames"} · Start ${track.start} · End ${track.end}`
      : "";
  }

  function updateSummary() {
    const tracks = groups.find(group => group.sequence === selection.sequence)?.tracks ?? [];
    summary.textContent = tracks.length
      ? `${selection.sequence} · ${tracks.length.toLocaleString()} tracks · ${tracks[0].duration}–${tracks.at(-1).duration} frames`
      : `${selection.sequence} · No tracks with valid frames`;
  }

  function showSelectedTrack() {
    showTrack(selectedTrack);
    svg.selectAll(".duration-dot")
      .classed("is-selected", dot => dot.sequence === selectedTrack?.sequence && dot.id === selectedTrack?.id);
  }

  function densityAt(tracks, duration, bandwidth) {
    return d3.mean(tracks, track => {
      const distance = (duration - track.duration) / bandwidth;
      return Math.exp(-0.5 * distance ** 2);
    }) ?? 0;
  }

  function render() {
    if (!groups.length) return;
    svg.selectAll("*").remove();
    const width = Math.max(240, svg.node().parentElement.clientWidth - 46);
    const height = 365;
    const left = 56;
    const right = width - 12;
    const bottom = height - 76;
    const top = 18;
    const maximum = d3.max(groups, group => group.tracks.at(-1)?.duration);
    const y = d3.scaleLinear().domain([0, Math.max(2, maximum ?? 1)]).nice()
      .range([bottom, top]);
    const x = d3.scaleBand().domain(groups.map(group => group.sequence))
      .range([left, right]).padding(0.22);
    const bandwidth = Math.max(1, (maximum ?? 1) * 0.035);
    const ticks = y.ticks(6).filter(Number.isInteger);

    svg.attr("viewBox", `0 0 ${width} ${height}`);
    const bandPadding = x.step() * 0.07;
    svg.append("rect").attr("class", "duration-active-band")
      .attr("x", x(selection.sequence) - bandPadding)
      .attr("y", top - 6)
      .attr("width", x.bandwidth() + 2 * bandPadding)
      .attr("height", bottom - top + 6)
      .attr("rx", 6);
    svg.append("g").attr("class", "grid").attr("transform", `translate(${left},0)`)
      .call(d3.axisLeft(y).tickValues(ticks).tickSize(left - right).tickFormat(() => ""))
      .call(axis => axis.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(${left},0)`)
      .call(d3.axisLeft(y).tickValues(ticks).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call(axis => axis.selectAll(".tick text")
        .classed("duration-active-label", sequence => sequence === selection.sequence)
        .attr("transform", width < 600 ? "rotate(-45)" : null)
        .attr("text-anchor", width < 600 ? "end" : "middle"));
    svg.append("text").attr("class", "duration-axis-label")
      .attr("x", (left + right) / 2).attr("y", height - 5).attr("text-anchor", "middle")
      .text("Video sequence");
    svg.append("text").attr("class", "duration-axis-label")
      .attr("transform", `translate(14,${(top + bottom) / 2}) rotate(-90)`)
      .attr("text-anchor", "middle").text("Track duration (frames)");

    groups.forEach(({sequence, tracks}, index) => {
      const center = x(sequence) + x.bandwidth() / 2;
      const group = svg.append("g").attr("class", "duration-sequence")
        .classed("is-active", sequence === selection.sequence);
      if (!tracks.length) {
        group.append("text").attr("class", "duration-axis-label")
          .attr("x", center).attr("y", bottom - 8).attr("text-anchor", "middle").text("0");
        return;
      }

      const min = Math.max(0, tracks[0].duration - 3 * bandwidth);
      const max = Math.min(y.domain()[1], tracks.at(-1).duration + 3 * bandwidth);
      const density = d3.range(81).map(step => {
        const duration = min + (max - min) * step / 80;
        return {duration, density:densityAt(tracks, duration, bandwidth)};
      });
      const peak = d3.max(density, point => point.density);
      const halfWidth = Math.min(x.bandwidth() / 2, 44);
      const violin = d3.area()
        .x0(point => center - point.density / peak * halfWidth)
        .x1(point => center + point.density / peak * halfWidth)
        .y(point => y(point.duration)).curve(d3.curveMonotoneY);

      group.append("path").datum(density).attr("d", violin)
        .attr("class", "duration-violin")
        .attr("fill", colors[index % colors.length]);

      const dots = tracks.map((track, trackIndex) => {
        const jitter = ((trackIndex * 0.61803398875) % 1) * 2 - 1;
        const spread = 0.87 * halfWidth * Math.min(1, densityAt(tracks, track.duration, bandwidth) / peak);
        return {...track, sequence, x:center + jitter * spread};
      });
      group.selectAll("circle").data(dots).join("circle")
        .attr("class", "duration-dot")
        .attr("cx", dot => dot.x).attr("cy", dot => y(dot.duration))
        .attr("r", width < 480 ? 1.7 : 2.2)
        .on("pointerenter", (_event, dot) => showTrack(dot))
        .on("pointerleave", () => showTrack(selectedTrack))
        .on("click", (_event, dot) => {
          window.selectDashboardSequence(sequence);
          selectedTrack = dot;
          showSelectedTrack();
        });
    });

    showSelectedTrack();
  }

  async function loadSelection(nextSelection) {
    const previous = selection;
    selection = nextSelection;
    if (previous?.path !== selection.path) selectedTrack = null;
    const currentRequest = ++requestId;
    if (previous?.cellTrack === selection.cellTrack && groups.length) {
      updateSummary();
      render();
      return;
    }

    groups = [];
    svg.selectAll("*").remove();
    showTrack(selectedTrack);
    summary.textContent = `Loading ${selection.cellTrack} tracks…`;

    try {
      manifest ??= await d3.json("data/datasets.json");
      const datasets = manifest.filter(dataset => dataset.cellTrack === nextSelection.cellTrack)
        .sort((a, b) => a.sequence.localeCompare(b.sequence, undefined, {numeric:true}));
      const loadedGroups = await Promise.all(datasets.map(async dataset => ({
        sequence:dataset.sequence, tracks:await loadTracks(dataset.path)
      })));
      if (currentRequest !== requestId) return;
      groups = loadedGroups;
      updateSummary();
      render();
    } catch (error) {
      if (currentRequest !== requestId) return;
      summary.textContent = "Could not load track durations.";
      details.textContent = error.message;
    }
  }

  window.addEventListener("dashboardselectionchange", event => loadSelection(event.detail));
  window.addEventListener("resize", render);
  if (window.dashboardSelection) loadSelection(window.dashboardSelection);
})();
