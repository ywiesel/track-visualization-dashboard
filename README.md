# Track Visualization Dashboard

An interactive dashboard for biologists to explore cell behavior using ground-truth tracks from Dataset 1. The project is designed to help users inspect track properties, compare movement across sequences and cell types, find unusual tracks, and investigate possible experimental issues.

## Project goal and questions

The dashboard supports these tasks:

- Explore track duration, average displacement, and observed divisions.
- Compare movement across sequences of the same cell type and across different cell types.
- Find tracks with unusual patterns, including very long or short durations and large position changes.
- Investigate possible data or experiment issues, such as empty sequences, slow-growing cultures, or microscope movement affecting tracks.

## Dashboard

The cell-track and sequence selectors at the top are shared across all three visualizations. The sequence selector only lists sequences available for the selected cell track.

- **Visual 1**

- **Visual 2:** 

- **Visual 3:** counts distinct tracks across horizontal position ranges for the selected sequence. Hover over a bar or focus it with the keyboard to view the exact position range, distinct-track count, observation count, and share of tracks.

Visual 3 counts a track once in every position range it visits. A track may therefore contribute to multiple bars. The bars show where tracks were observed across the sequence, not how many cells were present at a single moment.

## Project structure

```text
track-visualization-dashboard/
├── index.html
├── README.md
├── requirements.txt
├── css/
│   └── style.css
├── js/
│   ├── script.js
│   └── visualizations/
│       ├── visualization1.js
│       ├── visualization2.js
│       └── visualization3.js
├── data/
│   ├── datasets.json
│   ├── summary.csv
│   ├── HEK293T/
│   ├── MCF10A/
│   ├── MDA-MB-231/
│   └── U87/
├── images/
│   └── ground_truth_track_atlas.png
├── python/
│   ├── build_dataset_manifest.py
│   └── create_track_atlas.py
├── process-book/
│   ├── visual3_process_book.md
│   └── AI_PROMPT
└── screencast/
```

## Run locally

From the project root, start a local web server:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000> in your browser.


## Screencast

The `screencast/` folder is reserved for the final narrated 3–5-minute demo.
